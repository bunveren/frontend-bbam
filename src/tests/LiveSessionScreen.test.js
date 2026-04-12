import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react-native';
import LiveSessionScreen from '../screens/LiveSessionScreen';
import { usePoseProcessor } from '../hooks/usePoseProcessor';
import { mapMediaPipeToInternal } from '../utils/poseMath';
import { useExerciseLibrary } from '../hooks/useExerciseLibrary';

jest.mock('../hooks/usePoseProcessor');
jest.mock('../utils/poseMath', () => ({
  mapMediaPipeToInternal: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@thinksys/react-native-mediapipe', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    RNMediapipe: ({ onLandmark }) => (
      <TouchableOpacity 
        testID="mock-mediapipe" 
        onPress={() => onLandmark(JSON.stringify({ landmarks: [{ x: 0.1, y: 0.1 }] }))} 
      />
    ),
  };
});

jest.mock('../utils/feedback', () => ({
  feedbackProvider: {
    processFeedback: jest.fn(),
    triggerVoiceOutput: jest.fn(),
  },
}));

jest.mock('../hooks/useExerciseLibrary');

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: ({ children, testID }) => <div testID={testID || "skia-canvas"}>{children}</div>,
  Points: ({ color }) => <div testID="skia-points" data-color={color} />,
  vec: (x, y) => ({ x, y }),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: (val) => ({ value: val }),
    useDerivedValue: (fn) => ({ value: fn() }),
  };
});

describe('LiveSessionScreen - Refactored Tests', () => {
  const mockRoute = { params: { exerciseList: [{ id: '1', value: 10, mode: 'reps' }] } };
  const mockProcessFrame = jest.fn();
  const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    
    usePoseProcessor.mockReturnValue({
      reps: 0,
      seconds: 0,
      feedback: "Stand in T-Pose to Start",
      appState: 'CALIBRATING',
      processFrame: mockProcessFrame,
    });

    mapMediaPipeToInternal.mockReturnValue({ 11: { x: 0.5, y: 0.5 } });

    useExerciseLibrary.mockReturnValue({
      data: { '1': { mode: 'reps', name: 'Squat' } }
    });
  });

  afterEach(cleanup);

  test('ST-01: must start w calibrating mode', () => {
    const { getByText } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText('CALIBRATING')).toBeTruthy();
  });

  test('ST-02: should display rep counter when calibration ends', () => {
    const mockRepRoute = { 
      params: { 
        exerciseList: [{ id: 'squat_1', name: 'Squat', mode: 'reps', value: 10 }] 
      } 
    };
    useExerciseLibrary.mockReturnValue({
      data: { 'squat_1': { mode: 'reps' } }, 
      isLoading: false
    });

    usePoseProcessor.mockReturnValue({
      reps: 5,
      seconds: 0,
      feedback: "Looking good!",
      appState: 'WORKOUT',
      processFrame: mockProcessFrame,
    });

    const { getByText } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRepRoute} />);
    expect(getByText(/5 \/ 10/)).toBeTruthy();
  });

  test('ST-03: should display hold counter when calibration ends', () => {
    const mockHoldRoute = { 
      params: { 
        exerciseList: [{ id: 'plank_1', name: 'Plank', mode: 'hold', value: 15 }] 
      } 
    };

    usePoseProcessor.mockReturnValue({
      reps: 0,
      seconds: 15,
      feedback: "Perfect!",
      appState: 'WORKOUT',
      processFrame: mockProcessFrame,
    });
    
    const { getByText } = render(<LiveSessionScreen navigation={mockNavigation} route={mockHoldRoute} />);
    expect(getByText(/15s \/ 15s/)).toBeTruthy();
  });

  test('ST-04: close button should work', () => {
    const { getByTestId } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByTestId('close-button'));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  test('ST-07: processframe must be invoked when mediapipe data exists', () => {
    const { getByTestId } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByTestId('mock-mediapipe'));
    expect(mockProcessFrame).toHaveBeenCalled();
  });

  test('ST-10: feedback logic check (Skia transition)', () => {
    usePoseProcessor.mockReturnValue({
      reps: 1,
      feedback: "Looking good!",
      appState: 'WORKOUT',
      processFrame: mockProcessFrame,
    });
    
    const { getByText, getByTestId } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Looking good!")).toBeTruthy();
    expect(getByTestId('skia-canvas')).toBeTruthy();
  });
});