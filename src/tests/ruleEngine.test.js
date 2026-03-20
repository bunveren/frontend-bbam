jest.mock('expo-speech', () => ({
  speak: jest.fn(),
}), { virtual: true });

import { evaluateForm } from '../utils/ruleEngine';
import { generateMockLandmarks } from './testUtils';
import { calculateAngle, mapMediaPipeToInternal } from '../utils/poseMath';
import { feedbackProvider } from '../utils/feedback';

describe('RuleEngine Form Validation', () => {

  test('Squat: should detect incorrect knee angle (S-01) at 110 degrees', () => {
    const jointIds = [24, 26, 28];
    const mockLandmarks = generateMockLandmarks(jointIds, 110);
    
    const result = evaluateForm(mockLandmarks, 'Squat');
    
    expect(result.isCorrect).toBe(false);
    expect(result.errorType).toBe('S-01');
    expect(result.message).toContain('Squat depth is off');
  });

  test('Bicep-Curl: should detect over-extension (BC-01) at 175 degrees', () => {
    const jointIds = [12, 14, 16];
    const mockLandmarks = generateMockLandmarks(jointIds, 175);
    const result = evaluateForm(mockLandmarks, 'Bicep-Curl');

    expect(result.isCorrect).toBe(false);
    expect(result.errorType).toBe('BC-01');
    expect(result.message).toContain('muscle tension');
  });

  test('Plank: should detect sagging hips (PL-01) at 150 degrees', () => {
    const jointIds = [12, 24, 28];
    const mockLandmarks = generateMockLandmarks(jointIds, 150);
    const result = evaluateForm(mockLandmarks, 'Plank');

    expect(result.isCorrect).toBe(false);
    expect(result.errorType).toBe('PL-01');
    expect(result.message).toContain('straight line');
  });

  test('Lunge: should detect knee over toe (L-01) at 45 degrees', () => {
    const jointIds = [24, 26, 28];
    const mockLandmarks = generateMockLandmarks(jointIds, 45);
    const result = evaluateForm(mockLandmarks, 'Lunge');

    expect(result.isCorrect).toBe(false);
    expect(result.errorType).toBe('L-01');
    expect(result.message).toContain('90 degrees');
  });

  test('Success Case: Squat should pass at 75 degrees', () => {
    const jointIds = [24, 26, 28];
    const mockLandmarks = generateMockLandmarks(jointIds, 75);
    const result = evaluateForm(mockLandmarks, 'Squat');

    expect(result.isCorrect).toBe(true);
    expect(result.errorType).toBeNull();
  });

  test('Jumping-Jack: should detect arms being too low (JJ-01)', () => {
    const mockLandmarks = generateMockLandmarks([11, 0, 12], 30); 

    const result = evaluateForm(mockLandmarks, 'Jumping-Jack');
    expect(result.isCorrect).toBe(false);
    expect(result.errorType).toBe('JJ-01');
    expect(result.message).toContain('arms higher');
  });

  test('Shoulder-Press: should detect elbows dropping too low (SP-01)', () => {
    const mockLandmarks = generateMockLandmarks([12, 14, 16], 45);

    const result = evaluateForm(mockLandmarks, 'Shoulder-Press');
    expect(result.isCorrect).toBe(false);
    expect(result.errorType).toBe('SP-01');
    expect(result.message).toContain('elbows too low');
  });

  test('Glute-Bridge: should detect incomplete hip extension (GB-01)', () => {
    const mockLandmarks = generateMockLandmarks([12, 24, 26], 130);

    const result = evaluateForm(mockLandmarks, 'Glute-Bridge');
    expect(result.isCorrect).toBe(false);
    expect(result.errorType).toBe('GB-01');
    expect(result.message).toContain('Push your hips higher');
  });
});

{/* 
const knee = generateMockLandmarks([24, 26, 28], 80);
const torso = generateMockLandmarks([12, 24, 26], 170);
const combined = { ...knee, ...torso };
*/}

describe('Exercise Application - Unit Tests', () => {
  beforeEach(() => {
    feedbackProvider.lastFeedbackTime = 0;
  });

  //UT-08: Test the function that calculates the angle between 3 points
  test('UT-08: calculateAngle should return 90.0 for a right angle', () => {
    const p1 = { x: 0, y: 10 };
    const p2 = { x: 0, y: 0 };
    const p3 = { x: 10, y: 0 };

    const angle = calculateAngle(p1, p2, p3);
    expect(angle).toBe(90);
  });

  // UT-09: Test evaluateForm logic for Squat success
  test('UT-09: evaluateForm should return null error for a valid Squat', () => {
    const mockLandmarks = {
      24: { x: 0, y: 0, visibility: 1 },  // Hip
      26: { x: 0, y: 100, visibility: 1 }, // Knee
      28: { x: 100, y: 100, visibility: 1 }  // Ankle
    };

    const result = evaluateForm(mockLandmarks, 'Squat');
    
    expect(result.isCorrect).toBe(true);
    expect(result.errorType).toBeNull();
  });

  // UT-11: Test feedback message generation
  test('UT-11: processFeedback should return the correct string for sagging hips', () => {
    const mockEvaluation = {
      isCorrect: false,
      errorType: 'PL-01',
      message: 'Straighten your body! Keep your hips up.' 
    };

    const feedbackMessage = feedbackProvider.processFeedback(mockEvaluation);
    
    expect(feedbackMessage).toBe('Straighten your body! Keep your hips up.');
  });

  test('UT-25: should format raw MediaPipe landmarks into internal KeypointSet structure', () => {
    const rawMediaPipeOutput = [
      { x: 0.5, y: 0.5, z: -0.1, visibility: 0.99 },
      { x: 0.6, y: 0.4, z: -0.2, visibility: 0.95 }
    ];

    const keypointSet = mapMediaPipeToInternal(rawMediaPipeOutput);
    expect(typeof keypointSet).toBe('object');
    expect(keypointSet[0]).toEqual({
      x: 0.5,
      y: 0.5,
      z: -0.1,
      visibility: 0.99
    });

    expect(keypointSet[1].x).toBe(0.6);
    expect(keypointSet[1].visibility).toBe(0.95);
  });

});