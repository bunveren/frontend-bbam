import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { RNMediapipe, switchCamera } from '@thinksys/react-native-mediapipe';
import { Ionicons } from '@expo/vector-icons';
import { Canvas, Points, vec } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, runOnJS } from 'react-native-reanimated';

import { mapMediaPipeToInternal, smoothLandmarks } from '../../utils/poseMath';
import { usePoseProcessor } from '../../hooks/usePoseProcessor';
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary';
import { feedbackProvider } from '../../utils/feedback';

import { deleteSession } from '../../services/trackingService';

const LiveSessionScreen = ({ navigation, route }) => {
  const { exerciseList = [], sessionId } = route.params || {};
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentExercise = exerciseList[currentIndex] || {};
  const exerciseId = currentExercise.id || currentExercise._id;
  
  const { width, height } = useWindowDimensions();
  const aspectRatio = height / width;

  const { reps, seconds, feedback, appState, restCountdown, processFrame } = usePoseProcessor(exerciseId, aspectRatio);
  const { data: exerciseLibrary = {} } = useExerciseLibrary();

  const landmarksSV = useSharedValue({});
  const isCorrectSV = useSharedValue(true);

  useEffect(() => {
    isCorrectSV.value = feedback === "Looking good!" || feedback === "Perfect!";
  }, [feedback]);

  useEffect(() => {
    if (exerciseList.length > 0) {
      console.log("--- EXERCISE DATA DEBUG ---");
      console.log("Full Object:", JSON.stringify(exerciseList[0], null, 2));
      console.log("Keys available:", Object.keys(exerciseList[0]));
    } else {
      console.log("Exercise list is empty!");
    }
  }, [exerciseList]);

  const handleLandmarks = (data) => {
    const parsedData = JSON.parse(data);
    if (parsedData?.landmarks) {
      const internalLandmarks = mapMediaPipeToInternal(parsedData.landmarks);
      const smoothed = smoothLandmarks(internalLandmarks, landmarksSV.value, 0.2);
      landmarksSV.value = internalLandmarks;
      processFrame(internalLandmarks);
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

  const handleNextExercise = () => {
    if (currentIndex < exerciseList.length - 1) {
      setCurrentIndex(prev => prev + 1);
      feedbackProvider.triggerVoiceOutput("Exercise complete! Get ready for the next one.");
    } else {
      navigation.navigate('SessionSummary', { sessionId });
    }
  };

  const handleExitWorkout = async () => {
    await deleteSession(sessionId);
    navigation.goBack();
  };

  useEffect(() => {
    const targetValue = currentExercise.value || 0;
    const isFinished = currentExercise.mode === 'reps' ? reps >= targetValue : seconds >= targetValue;
    if (isFinished && targetValue > 0) handleNextExercise();
  }, [reps, seconds, currentIndex]);

  const currentConfig = exerciseLibrary[currentExercise.id];

  return (
    <View className="flex-1 bg-black">
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
      
    </View>
  );
};

export default LiveSessionScreen;