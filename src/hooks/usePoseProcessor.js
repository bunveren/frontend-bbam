import { useState, useRef, useEffect } from 'react';
import { useExerciseLibrary } from './useExerciseLibrary';
import { evaluateForm } from '../utils/ruleEngine';
import { calculateEMA, calculateAngle3D, calculateAngle } from '../utils/poseMath';
import { feedbackProvider } from '../utils/feedback';
import { getSideIds } from '../utils/ruleEngine';

export const usePoseProcessor = (exerciseId, currentIndex, screenAspectRatio) => {
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
  const exerciseIdRef = useRef(exerciseId);
  const calibrationTriggeredRef = useRef(false);
  const countdownIntervalRef = useRef(null);
  const { data: exerciseLibrary = {}, isLoading: isLibLoading } = useExerciseLibrary();

  const updateAppState = (newState) => {
    appStateRef.current = newState;
    setAppState(newState);
  };

  const startTransitionCountdown = () => {
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
      console.log("Kütüphane senkronize edildi. Mevcut Anahtarlar:", Object.keys(exerciseLibrary));
      console.log("Aranan Exercise ID:", exerciseId);
    }
  }, [exerciseLibrary]);

  useEffect(() => {
    if (exerciseId === null || exerciseId === undefined) return;

    setReps(0);
    setSeconds(0);
    setMotionState(0);
    motionStateRef.current = 0;
    smoothedAnglesRef.current = {};
    exerciseIdRef.current = exerciseId;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (calibrationTriggeredRef.current === true) {
      startTransitionCountdown();
    }
  }, [exerciseId, currentIndex]);

  const stopProcessor = () => {
    appStateRef.current = 'FINISHED';
    setAppState('FINISHED');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const checkTPose = (landmarks, aspectRatio = 1.7) => {
    const criticalIds = [11, 12, 13, 14];
    const isVisible = criticalIds.every(id => landmarks[id] && landmarks[id].visibility > 0.6);
    if (!isVisible) return false;
    
    const leftArmAngle = calculateAngle(landmarks[11], landmarks[13], landmarks[15], aspectRatio);
    const rightArmAngle = calculateAngle(landmarks[12], landmarks[14], landmarks[16], aspectRatio);

    const isLeftHorizontal = Math.abs(landmarks[11].y - landmarks[15].y) < 0.15;
    const isRightHorizontal = Math.abs(landmarks[12].y - landmarks[16].y) < 0.15;

    const isUpright = landmarks[12].y < landmarks[24].y;
    return leftArmAngle > 150 && rightArmAngle > 150 && isLeftHorizontal && isRightHorizontal && isUpright;
  };

  const processFrame = (landmarks, fallbackRatio = 1.7) => {
    if (!landmarks || !libRef.current) return;
    const currentId = exerciseIdRef.current;
    let config = libRef.current[currentId] || libRef.current[String(currentId)];

    if (!config && Array.isArray(libRef.current)) {
        config = libRef.current.find(ex => ex.id == currentId || ex._id == currentId);
    }

    if (!config || (!config.repConfig && !config.holdConfig)) {
        if (Math.random() < 0.05) {
             console.warn(`Egzersiz bulunamadı! Aranan ID: ${currentId}`);
        }
        return; 
    }
    
    const aspectRatio = screenAspectRatio || fallbackRatio;
    //console.log(`EX: ${exerciseId} | Mode: ${config.mode} | Angle: ${currentAngle} | Correct: ${evaluation.isCorrect} | State: ${motionStateRef.current}`);
    //if(!exerciseLibrary) console.log({exerciseLibrary});
    if (!landmarks || appStateRef.current === 'FINISHED') return;

    const currentAppState = appStateRef.current;
    const currentName = libRef.current?.[currentId]?.name;
    const visibilityValues = Object.values(landmarks).map(l => l.visibility || 0);
    const highConfidencePoints = visibilityValues.filter(v => v > 0.6).length;

    if (highConfidencePoints < 10 && currentAppState === 'WORKOUT') {
      setFeedback("Body not visible - Paused");
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (motionStateRef.current !== 0) { motionStateRef.current = 0; setMotionState(0); }
      return;
    }

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
    if (currentAppState === 'WAITING') return;

    let evaluation = {};
    let currentAngle = 0;
    if (currentAppState === 'WORKOUT') {
      const primaryJoints = config?.repConfig?.primaryJoints || config?.holdConfig?.primaryJoints;
      if (!primaryJoints) return;
      const getSideData = (side) => {
        const joints = getSideIds(primaryJoints, side);
        const angle = calculateAngle(landmarks[joints[0]], landmarks[joints[1]], landmarks[joints[2]], aspectRatio);
        const ev = evaluateForm(landmarks, config, aspectRatio, side);
        const vis = joints.reduce((acc, id) => acc + (landmarks[id]?.visibility || 0), 0) / joints.length;
        return { angle, evaluation: ev, visibility: vis };
      };

      const left = getSideData('left');
      const right = getSideData('right');

      let bestData = (right.visibility >= left.visibility) ? right : left;

      if (!bestData.evaluation.isCorrect && (left.evaluation.isCorrect || right.evaluation.isCorrect)) {
          bestData = left.evaluation.isCorrect ? left : right;
      } 
      else if (left.evaluation.isCorrect && right.evaluation.isCorrect) {
          bestData = left.angle < right.angle ? left : right;
      }

      evaluation = bestData.evaluation;
      currentAngle = calculateEMA(bestData.angle, smoothedAnglesRef.current[currentId]);
      smoothedAnglesRef.current[currentId] = currentAngle;
      
      //console.log(`[DEBUG] EX: ${config?.name || currentId} | Açı: ${currentAngle}° | State: ${motionStateRef.current} | Mode: ${config?.mode}`);
      if (config.mode === 'reps') {
        const isClosing = config.repConfig.startThreshold > config.repConfig.midThreshold;
        
        if (evaluation.isCorrect) {
          const currentState = motionStateRef.current;
          const atStart = isClosing ? currentAngle > config.repConfig.startThreshold : currentAngle < config.repConfig.startThreshold;
          const atMid = isClosing ? currentAngle < config.repConfig.midThreshold : currentAngle > config.repConfig.midThreshold;
          
          if (currentState === 0 && atStart) {
            motionStateRef.current = 1; setMotionState(1);
          } else if (currentState === 1 && atMid) {
            motionStateRef.current = 2; setMotionState(2);
          } else if (currentState === 2 && atStart) {
            setReps(prev => {
              const newCount = prev + 1;
              feedbackProvider.triggerVoiceOutput(`${newCount}`, 'COUNT');
              return newCount;
            });
            motionStateRef.current = 1; setMotionState(1);
          }
        }
      } else if (config.mode === 'hold') {
        if (evaluation.isCorrect) {
          if (!timerRef.current) {
            timerRef.current = setInterval(() => { setSeconds(prev => prev + 1); }, 1000);
          }
        } else if (timerRef.current) {
          clearInterval(timerRef.current); timerRef.current = null;
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

  return { reps, seconds, motionState, feedback, appState, appStateRef, restCountdown, processFrame, stopProcessor };
};