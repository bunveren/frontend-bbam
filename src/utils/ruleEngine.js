import { calculateAngle, calculateAngle3D } from './poseMath';
import exerciseRules from './rules.json';

export const getSideIds = (ids, targetSide) => ids.map(id => {
  if (id === 0) return 0;
  const isCurrentlyLeft = id % 2 !== 0;
  if (targetSide === 'left') return isCurrentlyLeft ? id : id - 1;
  if (targetSide === 'right') return isCurrentlyLeft ? id + 1 : id;
  return id;
});

export const evaluateForm = (landmarks, currentExercise, aspectRatio = 1, forcedSide = null) => {
  const feedback = { message: "Looking good!", isCorrect: true, errorType: null };
  if (!currentExercise || !landmarks) return feedback;

  const config = currentExercise.repConfig || currentExercise.holdConfig;
  
  if (!config || !config.primaryJoints) {
    //console.debug("config not sent");
    return feedback; 
  }
  const criticalJoints = config.primaryJoints;

  let bestSide = forcedSide;
  if (!bestSide) {
    const leftPrimary = getSideIds(criticalJoints, 'left');
    const rightPrimary = getSideIds(criticalJoints, 'right');
    const leftVis = leftPrimary.reduce((acc, id) => acc + (landmarks[id]?.visibility || 0), 0) / criticalJoints.length;
    const rightVis = rightPrimary.reduce((acc, id) => acc + (landmarks[id]?.visibility || 0), 0) / criticalJoints.length;
    bestSide = rightVis >= leftVis ? 'right' : 'left';
  }

  if (currentExercise.requireHorizontal) {
    const shoulder = landmarks[bestSide === 'right' ? 12 : 11];
    const ankle = landmarks[bestSide === 'right' ? 28 : 27];

    if (shoulder && ankle) {
      const dy = Math.abs(shoulder.y - ankle.y);
      const dx = Math.abs(shoulder.x - ankle.x);
      
      if (dy > dx * 0.8) { 
        return { 
          message: "Please get into a horizontal position on the floor.", 
          isCorrect: false, 
          errorType: 'ORIENTATION_ERROR' 
        };
      }
    }
  }

  const targetSideJoints = getSideIds(criticalJoints, bestSide);
  const sideVis = targetSideJoints.reduce((acc, id) => acc + (landmarks[id]?.visibility || 0), 0) / criticalJoints.length;
  if (sideVis < 0.2 && Object.keys(landmarks).length > 5) {
    return { message: "Body not fully visible", isCorrect: false, errorType: 'VISIBILITY' };
  }
  for (const rule of currentExercise.rules) {
    const hasLeft = rule.joints.some(id => id !== 0 && id % 2 !== 0);
    const hasRight = rule.joints.some(id => id !== 0 && id % 2 === 0);
    const isCrossBody = hasLeft && hasRight;
    const jointsToUse = isCrossBody ? rule.joints : getSideIds(rule.joints, bestSide);
    
    const p1 = landmarks[jointsToUse[0]];
    const p2 = landmarks[jointsToUse[1]];
    const p3 = landmarks[jointsToUse[2]];
    if (!p1 || !p2 || !p3) continue;

    const angle = calculateAngle(p1, p2, p3, aspectRatio);
    const isMinError = rule.minAngle !== undefined && angle < (rule.minAngle - 2);
    const isMaxError = rule.maxAngle !== undefined && angle > (rule.maxAngle + 2);

    if (isMinError || isMaxError) {
      feedback.message = rule.message;
      feedback.isCorrect = false;
      feedback.errorType = rule.id;
      break; 
    }
  }

  return feedback;
};