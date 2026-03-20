import { calculateAngle } from './poseMath';
import exerciseRules from './rules.json';

export const evaluateForm = (landmarks, exerciseType) => {
  const feedback = { message: "Looking good!", isCorrect: true, errorType: null };
  const currentExercise = exerciseRules[exerciseType];

  if (!currentExercise || !landmarks) return feedback;
  for (const rule of currentExercise.rules) {
    const leftSide = [23, 25, 27]; // Hip, Knee, Ankle (Left)
    const rightSide = [24, 26, 28]; // Hip, Knee, Ankle (Right)
    let jointsToUse = rule.joints;
    if (JSON.stringify(rule.joints) === JSON.stringify(rightSide)) {
      const leftVis = (landmarks[23]?.visibility || 0) + (landmarks[25]?.visibility || 0);
      const rightVis = (landmarks[24]?.visibility || 0) + (landmarks[26]?.visibility || 0);
      jointsToUse = rightVis >= leftVis ? rightSide : leftSide;
    }

    const p1 = landmarks[jointsToUse[0]];
    const p2 = landmarks[jointsToUse[1]];
    const p3 = landmarks[jointsToUse[2]];

    if (!p1 || !p2 || !p3) continue;

    const angle = calculateAngle(p1, p2, p3);
    const isError = (rule.minAngle !== undefined && angle < rule.minAngle) || (rule.maxAngle !== undefined && angle > rule.maxAngle);

    if (isError) {
      feedback.message = rule.message;
      feedback.isCorrect = false;
      feedback.errorType = rule.id;
      break;
    }
  }

  return feedback;
};