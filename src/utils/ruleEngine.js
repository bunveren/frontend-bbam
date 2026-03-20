import { calculateAngle, calculateAngle3D } from './poseMath';
import exerciseRules from './rules.json';

const getSideIds = (ids, targetSide) => ids.map(id => {
  if (id === 0) return 0;
  const isCurrentlyLeft = id % 2 !== 0;
  if (targetSide === 'left') return isCurrentlyLeft ? id : id - 1;
  if (targetSide === 'right') return isCurrentlyLeft ? id + 1 : id;
  return id;
});

export const evaluateForm = (landmarks, exerciseType) => {
  const feedback = { message: "Looking good!", isCorrect: true, errorType: null };
  const currentExercise = exerciseRules[exerciseType];
  if (!currentExercise || !landmarks) return feedback;

  const config = currentExercise.repConfig || currentExercise.holdConfig;
  const criticalJoints = config.primaryJoints;
  const leftPrimary = getSideIds(criticalJoints, 'left');
  const rightPrimary = getSideIds(criticalJoints, 'right');
  const leftVis = leftPrimary.reduce((acc, id) => acc + (landmarks[id]?.visibility || 0), 0) / criticalJoints.length;
  const rightVis = rightPrimary.reduce((acc, id) => acc + (landmarks[id]?.visibility || 0), 0) / criticalJoints.length;

  if (Math.max(leftVis, rightVis) < 0.2 && Object.keys(landmarks).length > 5) return { message: "Body not fully visible", isCorrect: false, errorType: 'VISIBILITY' };
  
  const bestSide = rightVis >= leftVis ? 'right' : 'left';
  //let errors = [];
  for (const rule of currentExercise.rules) {
    const hasLeft = rule.joints.some(id => id !== 0 && id % 2 !== 0);
    const hasRight = rule.joints.some(id => id !== 0 && id % 2 === 0);
    const isCrossBody = hasLeft && hasRight;
    const jointsToUse = isCrossBody ? rule.joints : getSideIds(rule.joints, bestSide);
    
    const p1 = landmarks[jointsToUse[0]];
    const p2 = landmarks[jointsToUse[1]];
    const p3 = landmarks[jointsToUse[2]];
    if (!p1 || !p2 || !p3) continue;

    const angle = calculateAngle3D(p1, p2, p3);
    const isMinError = rule.minAngle !== undefined && angle < (rule.minAngle-2);
    const isMaxError = rule.maxAngle !== undefined && angle > (rule.maxAngle+2);
    //Are you adjusting the seat really? That's been your fucking problem the whole time. The seat height. So now you have it, right?
    if (isMinError || isMaxError) {
      feedback.message = rule.message;
      feedback.isCorrect = false;
      feedback.errorType = rule.id;
      break; 
    }

    /* en oncelikli rule erroru kullaniciya vermemiz lazim
      if (isMinError || isMaxError) {
        errors.push({
          id: rule.id,
          priority: rule.priority || 5,
          message: rule.message,
          currentAngle: angle3D
        });
      }
    }

    if (errors.length > 0) {
      const primaryError = errors.sort((a, b) => a.priority - b.priority)[0];
      return { ...primaryError, isCorrect: false };
    }
    */
  }

  return feedback;
};