import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { RNMediapipe, switchCamera } from '@thinksys/react-native-mediapipe';
import { Ionicons } from '@expo/vector-icons';
import { Canvas, Points, vec } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, runOnJS } from 'react-native-reanimated';

import { mapMediaPipeToInternal, smoothLandmarks } from '../../utils/poseMath';
import { usePoseProcessor } from '../../hooks/usePoseProcessor';
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary';
import { feedbackProvider } from '../../utils/feedback';

import { deleteSession, endSession } from '../../services/trackingService';

const LiveSessionScreen = ({ navigation, route }) => {
  const { exerciseList = [], sessionId, planName } = route.params || {};
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentExercise = exerciseList[currentIndex] || {};
  const exerciseId = currentExercise.id || currentExercise._id;
  
  const { width, height } = useWindowDimensions();
  const aspectRatio = height / width;

  const { reps, seconds, feedback, appState, appStateRef, restCountdown, processFrame, stopProcessor } = usePoseProcessor(exerciseId, currentIndex, aspectRatio);
  const { data: exerciseLibrary = {} } = useExerciseLibrary();

  const landmarksSV = useSharedValue({});
  const isCorrectSV = useSharedValue(true);

  const statsRef = useRef({
    startTime: new Date(),
    completedExercises: [],
    currentStats: {
      totalFrames: 0,
      correctFrames: 0,
      errors: new Set()
    }
  });
  const isSessionEndedRef = useRef(false);

  useEffect(() => {
    isCorrectSV.value = feedback === "Looking good!" || feedback === "Perfect!";
  }, [feedback]);


  const handleLandmarks = (data) => {
    if (isSessionEndedRef.current) return;

    const parsedData = JSON.parse(data);
    if (parsedData?.landmarks) {
      const internalLandmarks = mapMediaPipeToInternal(parsedData.landmarks);
      const smoothed = smoothLandmarks(internalLandmarks, landmarksSV.value, 0.3);
      landmarksSV.value = smoothed;
      const result = processFrame(internalLandmarks);

      // collect stats for current exercise
      //console.log({app: appStateRef.current, result});
      if (appStateRef.current === 'WORKOUT' && result?.evaluation) {
        const { isCorrect, message, errorType } = result.evaluation;
        
        statsRef.current.currentStats.totalFrames += 1;
        if (isCorrect) {
          statsRef.current.currentStats.correctFrames += 1;
        } else if (message && message !== "Looking good!" && message !== "Perfect!") {
          statsRef.current.currentStats.errors.add(message);
        }
        //console.log({totalFrames: statsRef.current.currentStats.totalFrames, correctFrames: statsRef.current.currentStats.correctFrames});
      }
    }
  };

  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const onLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ w: width, h: height });
  };

  const skiaPoints = useDerivedValue(() => {
    return Object.keys(landmarksSV.value)
      .filter((id) => {
        const nId = parseInt(id);
        return nId >= 11 && nId <= 28;
      })
      .map((id) => {
        const p = landmarksSV.value[id];
        return vec((1 - p.x) * width, p.y * height);
      });
  });

  const dotColor = useDerivedValue(() => 
    isCorrectSV.value ? "#00FF00" : "#FF0000"
  );

  const handleNextExercise = async () => {
    if (currentIndex >= exerciseList.length) return;

    const isLastExercise = currentIndex === exerciseList.length - 1;

    // create stats history
    const currentStats = statsRef.current.currentStats;
    const accuracy = currentStats.totalFrames > 0 
      ? (currentStats.correctFrames / currentStats.totalFrames) * 100 
      : 100;
    
    const exerciseResult = {
      exercise_id: currentExercise.id,
      accuracy_score: Math.round(accuracy),
      ...(currentExercise.mode === 'reps' ? { completed_reps: reps } : { completed_seconds: seconds }),
      step_order: currentIndex + 1,
      common_errors: Array.from(currentStats.errors)
    };
    statsRef.current.completedExercises.push(exerciseResult);

    // reset stats for next exercise
    statsRef.current.currentStats = { totalFrames: 0, correctFrames: 0, errors: new Set() };

    if (!isLastExercise) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev + 1);
      feedbackProvider.triggerVoiceOutput("Exercise complete!");
    } else {
      const endTime = new Date();
      const durationMinutes = Math.max(1, Math.round((endTime - statsRef.current.startTime) / 60000));

      const finalPayload = {
        plan_name: planName,
        duration_minutes: durationMinutes,
        exercises: statsRef.current.completedExercises
      };

      isSessionEndedRef.current = true; 
      stopProcessor();

      try {
        //console.log({ errors: finalPayload.exercises[0]?.common_errors,finalStats: finalPayload.exercises, duration: finalPayload.duration_minutes });
        await endSession(sessionId, finalPayload);
      } catch (e) {
        console.error("Failed to save session results:", e);
      }
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            { 
              name: 'MainTabs', 
              state: {
                routes: [{ name: 'Progress', params: { sessionId } }]
              }
            },
          ],
        })
      );
    }
  };

  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleExitWorkout = async () => {
    await deleteSession(sessionId);
    navigation.goBack();
  };

  useEffect(() => {
    if (isTransitioning) {
      if (reps === 0 && seconds === 0) {
        setIsTransitioning(false);
      }
      return; 
    }

    const targetValue = currentExercise.value || 0;
    const isFinished = currentExercise.mode === 'reps' ? reps >= targetValue : seconds >= targetValue;
    if (!isSessionEndedRef.current && appState === 'WORKOUT' && isFinished && targetValue > 0) handleNextExercise();
  }, [reps, seconds, currentIndex, isTransitioning, appState, currentExercise.mode, currentExercise.value]);

  const currentConfig = exerciseLibrary[currentExercise.id];

  return (
    <View className="flex-1 bg-black">
      {!isSessionEndedRef.current ? (
        <>
          <RNMediapipe
            style={StyleSheet.absoluteFill}
            onLandmark={handleLandmarks}
            modelComplexity={2} 
            minDetectionConfidence={0.7}
            minTrackingConfidence={0.7}
            face={false}
            leftArm={true}
            rightArm={true}
            leftWrist={true}
            rightWrist={true}
            torso={true}
            leftLeg={true}
            rightLeg={true}
            leftAnkle={true}
            rightAnkle={true}
          />

          <View className="absolute top-12 left-6">
            <TouchableOpacity accessibilityLabel="close-button" testID="close-button" onPress={handleExitWorkout} className="bg-white/20 p-3 rounded-full">
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => switchCamera()} className="bg-white/20 p-3 rounded-full">
              <Ionicons name="camera-reverse-outline" size={28} color="white"></Ionicons>
            </TouchableOpacity>
          </View>

          <View className="absolute bottom-20 self-center bg-bbam-indigo-main/80 px-6 py-4 rounded-3xl w-full">
            <Text className="text-white font-bold text-center text-m3-headline-small">
              {appState === 'CALIBRATING' ? "CALIBRATING" :
                `${currentExercise.name}:   ${currentConfig?.mode === 'reps' ? `${reps} / ${currentExercise.value}` : `${seconds}s / ${currentExercise.value}s`}`
              }
            </Text>
            <Text className="text-white text-center text-m3-body-large">
              {appState === 'WAITING' ? `Starting in ${restCountdown}...` : feedback}
            </Text>
          </View> 
        </>
      ) : (
        <View style={StyleSheet.absoluteFill} className="bg-bbam-back-page items-center justify-center z-[9999]">
          <ActivityIndicator size="large" color="#585AD1" />
          <Text className="text-bbam-text-main mt-4 text-m3-body-large font-bold">
            Analyzing your workout session...
          </Text>
        </View>
      )}
      
    </View>
  );
};

export default LiveSessionScreen;