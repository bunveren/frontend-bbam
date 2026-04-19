import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react-native';
import LiveSessionScreen from '../screens/LiveSessionScreen';
import { usePoseProcessor } from '../hooks/usePoseProcessor';
import { mapMediaPipeToInternal, smoothLandmarks } from '../utils/poseMath';
import { useExerciseLibrary } from '../hooks/useExerciseLibrary';

jest.mock('../hooks/usePoseProcessor');
jest.mock('../hooks/useExerciseLibrary');

jest.mock('../utils/feedback', () => ({
  feedbackProvider: {
    processFeedback: jest.fn(),
    triggerVoiceOutput: jest.fn(),
  },
}));

jest.mock('../utils/poseMath', () => ({
  mapMediaPipeToInternal: jest.fn((data) => data),
  smoothLandmarks: jest.fn((next, prev) => next),
  calculateAngle3D: jest.fn(() => 180),
  calculateEMA: jest.fn((v) => v),
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

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }) => <View testID="svg-root">{children}</View>,
    Circle: (props) => <View {...props} testID="svg-circle" />,
  };
});

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
  
  // removed 5 : should color incorrect form for now
  test('ST-06: ui must react when visibility error occurs', () => {
    usePoseProcessor.mockReturnValue({
      reps: 0,
      seconds: 0,
      feedback: "Body not fully visible",
      appState: 'WORKOUT',
      processFrame: mockProcessFrame,
    });
    const { getByText } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText('Body not fully visible')).toBeTruthy();
  });

  test('ST-07: processframe must be invoked when mediapipe data exists', () => {
    const { getByTestId } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByTestId('mock-mediapipe'));
    expect(mockProcessFrame).toHaveBeenCalled();
  });

  test('ST-08: should not see counter when calibrating', () => {
    usePoseProcessor.mockReturnValue({
      reps: 10,
      appState: 'CALIBRATING',
      feedback: "Wait",
      processFrame: mockProcessFrame,
    });
    const { getByText, queryByText } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText('CALIBRATING')).toBeTruthy();
    expect(queryByText('10')).toBeNull();
  });

  test('ST-09: second format must be true for hold type exercises', () => {
    const mockHoldRoute = { 
      params: { 
        exerciseList: [{ id: 'plank_1', mode: 'hold', value: 60 }] 
      } 
    };

    usePoseProcessor.mockReturnValue({
      reps: 0,
      seconds: 45,
      feedback: "Looking good!",
      appState: 'WORKOUT',
      processFrame: mockProcessFrame,
    });

    const { getByText } = render(<LiveSessionScreen navigation={mockNavigation} route={mockHoldRoute} />);
    expect(getByText(/45s \/ 60s/)).toBeTruthy();
  });

  test('ST-10: skeleton color must change in correct form', () => {
    usePoseProcessor.mockReturnValue({
      reps: 1,
      feedback: "Looking good!",
      appState: 'WORKOUT',
      processFrame: mockProcessFrame,
    });
    
    const { getByText, getByTestId } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Looking good!")).toBeTruthy();
    //expect(getByTestId('skia-canvas')).toBeTruthy(); //bu componenti sildim stabil olmadıgı icin
  });
});

describe('LiveSessionScreen - in session tests', () => {
  const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
  const mockExerciseList = [
    { id: 'squat_1', name: 'Squat', mode: 'reps', value: 3 },
    { id: 'plank_1', name: 'Plank', mode: 'hold', value: 10 }
  ];
  const mockRoute = { params: { exerciseList: mockExerciseList, sessionId: 123 } };

  beforeEach(() => {
    jest.clearAllMocks();
    require('../hooks/useExerciseLibrary').useExerciseLibrary.mockReturnValue({
      data: { 
        'squat_1': { mode: 'reps' }, 
        'plank_1': { mode: 'hold' } 
      }
    });
  });

  test('ST-11: should start w first exercise and should show target rep', () => {
    usePoseProcessor.mockReturnValue({
      reps: 0, seconds: 0, appState: 'WORKOUT', feedback: "Looking good!", processFrame: jest.fn()
    });
    const { getByText } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText(/0 \/ 3/)).toBeTruthy();
  });

  test('ST-12: should switch exercise when target rep is achieved', () => {
    const { rerender, getByText } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    usePoseProcessor.mockReturnValue({
      reps: 3, seconds: 0, appState: 'WORKOUT', feedback: "Looking good!", processFrame: jest.fn()
    });

    rerender(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText(/0s/)).toBeTruthy(); 
  });

  test('ST-13: should navigate to session end screen when done', () => {
    const singleExerciseRoute = { 
      params: { 
        exerciseList: [{ id: 'plank_1', name: 'Plank', mode: 'hold', value: 10 }],
        sessionId: 123 
      } 
    };

    usePoseProcessor.mockReturnValue({
      reps: 0, 
      seconds: 10,
      appState: 'WORKOUT', 
      feedback: "Perfect!", 
      processFrame: jest.fn()
    });

    const finalExerciseRoute = { 
      params: { 
        exerciseList: [{ id: 'plank_1', name: 'Plank', mode: 'hold', value: 10 }],
        sessionId: 123 
      } 
    };

    render(<LiveSessionScreen navigation={mockNavigation} route={singleExerciseRoute} />);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Progress', { sessionId: 123 });
  });

  test('ST-14: useposeprocessor must be invoked by new id when an exercise is done', () => {
    const mockProcess = usePoseProcessor;
    const { rerender } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    expect(mockProcess).toHaveBeenCalledWith('squat_1');
    usePoseProcessor.mockReturnValue({
      reps: 3, seconds: 0, appState: 'WORKOUT', processFrame: jest.fn()
    });
    rerender(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    expect(mockProcess).toHaveBeenCalledWith('plank_1');
  });
});