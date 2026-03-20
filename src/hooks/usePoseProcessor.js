import { useState, useRef, useEffect } from 'react';
import { evaluateForm } from '../utils/ruleEngine';
import { calculateEMA, calculateAngle3D } from '../utils/poseMath';
import { feedbackProvider } from '../utils/feedback';
import exerciseRules from '../utils/rules.json';

export const usePoseProcessor = (exerciseType) => {
  const [appState, setAppState] = useState('CALIBRATING'); // 'CALIBRATING' | 'WORKOUT'
  const [reps, setReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [motionState, setMotionState] = useState(0);
  const [feedback, setFeedback] = useState("Stand in T-Pose to Start");
  const smoothedAnglesRef = useRef({});
  const timerRef = useRef(null);

  const checkTPose = (landmarks) => {
    if (!landmarks[11] || !landmarks[12]) return false;
    const leftArmAngle = calculateAngle3D(landmarks[11], landmarks[13], landmarks[15]);
    const rightArmAngle = calculateAngle3D(landmarks[12], landmarks[14], landmarks[16]);
    const isUpright = landmarks[12].y < (landmarks[24]?.y || 1); 

    return leftArmAngle > 160 && rightArmAngle > 160 && isUpright;
  };

  const processFrame = (landmarks) => {
    if (!landmarks) return;
    if (appState === 'CALIBRATING') {
      if (checkTPose(landmarks)) {
        setAppState('WORKOUT');
        setFeedback("Calibration Complete! Start.");
        feedbackProvider.triggerVoiceOutput("Calibration complete. Start your exercise!");
      }
      return;
    }

    const config = exerciseRules[exerciseType];
    const evaluation = evaluateForm(landmarks, exerciseType);
    
    const primaryJoints = config.repConfig?.primaryJoints || config.holdConfig?.primaryJoints;
    const rawAngle = calculateAngle3D(
      landmarks[primaryJoints[0]], 
      landmarks[primaryJoints[1]], 
      landmarks[primaryJoints[2]]
    );
    
    const currentAngle = calculateEMA(rawAngle, smoothedAnglesRef.current[exerciseType]);
    smoothedAnglesRef.current[exerciseType] = currentAngle;

    if (config.mode === 'reps') {
      if (evaluation.isCorrect) {
        if (motionState === 0 && currentAngle > config.repConfig.startThreshold) setMotionState(1);
        else if (motionState === 1 && currentAngle < config.repConfig.midThreshold) setMotionState(2); 
        else if (motionState === 2 && currentAngle > config.repConfig.startThreshold) {
          setReps(prev => {
            const newCount = prev + 1;
            feedbackProvider.triggerVoiceOutput(`${newCount}`);
            return newCount;
          });
          setMotionState(1);
        }
      }
    } 
    else if (config.mode === 'hold') {
      if (evaluation.isCorrect && !timerRef.current) {
        timerRef.current = setInterval(() => {
          setSeconds(prev => prev + 1);
        }, 1000);
      } else if (!evaluation.isCorrect && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    const msg = feedbackProvider.processFeedback(evaluation);
    setFeedback(msg);

    return { evaluation, currentAngle };
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { reps, seconds, motionState, feedback, appState, processFrame };
};