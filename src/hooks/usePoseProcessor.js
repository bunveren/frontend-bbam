import { useState, useRef, useEffect } from 'react';
import { useExerciseLibrary } from './useExerciseLibrary';
import { evaluateForm } from '../utils/ruleEngine';
import { calculateEMA, calculateAngle3D } from '../utils/poseMath';
import { feedbackProvider } from '../utils/feedback';

export const usePoseProcessor = (exerciseId) => {
  const [appState, setAppState] = useState('CALIBRATING'); // 'CALIBRATING' | 'WORKOUT' | 'WAITING'
  const appStateRef = useRef('CALIBRATING'); // for some reason ui shows the change but the processFrame func is stuck with the old value (dont ask), we need this
  const [reps, setReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [motionState, setMotionState] = useState(0);
  const [feedback, setFeedback] = useState("Stand in T-Pose to Start");
  const [restCountdown, setRestCountdown] = useState(0); // wait between exercises
  const smoothedAnglesRef = useRef({});
  const timerRef = useRef(null);
  const tPoseFramesRef = useRef(0);
  const motionStateRef = useRef(0);
  const libRef = useRef(null);
  const calibrationTriggeredRef = useRef(false);
  const countdownIntervalRef = useRef(null);
  const { data: exerciseLibrary = {}, isLoading: isLibLoading } = useExerciseLibrary();

  const updateAppState = (newState) => {
    appStateRef.current = newState;
    setAppState(newState);
  };

  const startTransitionCountdown = () => {
    // Clear any existing countdowns
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    updateAppState('WAITING');
    setRestCountdown(5);
    setFeedback("Get ready for the next exercise!");
    feedbackProvider.triggerVoiceOutput("Next exercise coming up.", 'INFO');

    countdownIntervalRef.current = setInterval(() => {
      setRestCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          updateAppState('WORKOUT');
          setFeedback("Go!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    feedbackProvider.triggerVoiceOutput('Calibrating, please stand in a Tee Pose to Start', 'INFO');
  }, []);

  useEffect(() => {
    if (exerciseLibrary) {
      libRef.current = exerciseLibrary;
      console.log("Library synced");
    }
  }, [exerciseLibrary]);

  useEffect(() => {
    if (exerciseId === null || exerciseId === undefined) return;

    setReps(0);
    setSeconds(0);
    setMotionState(0);
    motionStateRef.current = 0;
    smoothedAnglesRef.current = {};

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (calibrationTriggeredRef.current === true) {
      startTransitionCountdown();
    }
  }, [exerciseId]);

  const checkTPose = (landmarks) => {
    if (!landmarks[11] || !landmarks[12]) return false;
    
    const leftArmAngle = calculateAngle3D(landmarks[11], landmarks[13], landmarks[15]);
    const rightArmAngle = calculateAngle3D(landmarks[12], landmarks[14], landmarks[16]);

    const isLeftHorizontal = Math.abs(landmarks[11].y - landmarks[15].y) < 0.2;
    const isRightHorizontal = Math.abs(landmarks[12].y - landmarks[16].y) < 0.2;

    const isUpright = landmarks[12].y < landmarks[24].y;

    console.log({
      angles: `${leftArmAngle}, ${rightArmAngle}`,
      horizontal: `${isLeftHorizontal}, ${isRightHorizontal}`,
      upright: isUpright
    });

    return leftArmAngle > 130 && rightArmAngle > 130 && isLeftHorizontal && isRightHorizontal && isUpright;
  };

  const processFrame = (landmarks) => {
    //console.log(`EX: ${exerciseId} | Mode: ${config.mode} | Angle: ${currentAngle} | Correct: ${evaluation.isCorrect} | State: ${motionStateRef.current}`);
    //if(!exerciseLibrary) console.log({exerciseLibrary});
    if (!landmarks) return;

    const currentAppState = appStateRef.current;

    if (!calibrationTriggeredRef.current && currentAppState === 'CALIBRATING') {
      if (checkTPose(landmarks)) {
        tPoseFramesRef.current += 1;
        if (tPoseFramesRef.current > 10 && !calibrationTriggeredRef.current) {
          calibrationTriggeredRef.current = true;
          setFeedback("Calibration Complete! Start.");
          feedbackProvider.triggerVoiceOutput("Calibration complete.", 'INFO', startTransitionCountdown);
        }
      } else tPoseFramesRef.current = 0;
      return;
    }

    //console.log({currentAppState});

    if (currentAppState === 'WAITING') {
      return;
    }

    let evaluation = {};
    let currentAngle = 0;
    if (currentAppState === 'WORKOUT') {
      const config = libRef.current?.[exerciseId];
      //console.log(config);
      evaluation = evaluateForm(landmarks, config);
      
      const primaryJoints = config.repConfig?.primaryJoints || config.holdConfig?.primaryJoints;
      const rawAngle = calculateAngle3D(
        landmarks[primaryJoints[0]],
        landmarks[primaryJoints[1]],
        landmarks[primaryJoints[2]]
      );
      
      currentAngle = calculateEMA(rawAngle, smoothedAnglesRef.current[exerciseId]);
      smoothedAnglesRef.current[exerciseId] = currentAngle;
      //console.log(`Angle: ${currentAngle} | State: ${motionStateRef.current} | Start: ${config.repConfig.startThreshold}`);
      // bicep curl 160 ama 145 olmalı, json&db degisecek
      if (config.mode === 'reps') {
        if (evaluation.isCorrect) {
          const currentState = motionStateRef.current;
          if (currentState === 0 && currentAngle > config.repConfig.startThreshold) {
            motionStateRef.current = 1;
            setMotionState(1);
          } 
          else if (currentState === 1 && currentAngle < config.repConfig.midThreshold) {
            motionStateRef.current = 2;
            setMotionState(2);
          } 
          else if (currentState === 2 && currentAngle > config.repConfig.startThreshold) {
            setReps(prev => {
              const newCount = prev + 1;
              feedbackProvider.triggerVoiceOutput(`${newCount}`);
              return newCount;
            });
            motionStateRef.current = 1;
            setMotionState(1);
          }
        }
      } 
      else if (config.mode === 'hold') { // bu guncellemeyi denemedim
        const primaryJoints = config.holdConfig?.primaryJoints;
        let currentAngle = 0;

        if (primaryJoints && landmarks[primaryJoints[0]]) {
          const rawAngle = calculateAngle3D(
            landmarks[primaryJoints[0]], 
            landmarks[primaryJoints[1]], 
            landmarks[primaryJoints[2]]
          );
          currentAngle = calculateEMA(rawAngle, smoothedAnglesRef.current[exerciseId]);
          smoothedAnglesRef.current[exerciseId] = currentAngle;
        }

        if (Math.random() < 0.05) {
          console.log(`[HOLD DEBUG] 
            Angle: ${currentAngle} 
            Correct: ${evaluation.isCorrect} 
            Error: ${evaluation.message} 
            Timer Active: ${!!timerRef.current}`);
        }

        if (evaluation.isCorrect) {
          if (!timerRef.current) {
            console.log("Hold started: Form is correct.");
            timerRef.current = setInterval(() => {
              setSeconds(prev => prev + 1);
            }, 1000);
          }
        } 
        else if (timerRef.current) {
            console.warn(`Hold stopped: ${evaluation.message}`);
            clearInterval(timerRef.current);
            timerRef.current = null;
          
        }
      }

      const msg = feedbackProvider.processFeedback(evaluation);
      setFeedback(msg);
    }

    return { evaluation, currentAngle };
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return { reps, seconds, motionState, feedback, appState, restCountdown, processFrame };
};