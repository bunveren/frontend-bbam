import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react-native';
import LiveSessionScreen from '../screens/LiveSessionScreen';
import { usePoseProcessor } from '../hooks/usePoseProcessor';
import { mapMediaPipeToInternal } from '../utils/poseMath';

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
        onPress={() => onLandmark({ landmarks: [{ x: 0.1, y: 0.1 }] })} 
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

describe('LiveSessionScreen - UI & Integration Tests', () => {
  const mockNavigation = { goBack: jest.fn() };
  const mockRoute = { params: { exerciseType: 'Squat' } };
  const mockProcessFrame = jest.fn();

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
  });

  afterEach(cleanup);

  test('ST-01: must start w calibrating mode', () => {
    const { getByText } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText('CALIBRATING')).toBeTruthy();
  });

  test('ST-02: should display rep counter when calibration ends', () => {
    usePoseProcessor.mockReturnValue({
      reps: 5,
      seconds: 0,
      feedback: "Looking good!",
      appState: 'WORKOUT',
      processFrame: mockProcessFrame,
    });
    const { getByText, queryByText } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    expect(queryByText('CALIBRATING')).toBeNull();
    expect(getByText('5')).toBeTruthy();
  });

  test('ST-03: should display hold counter when calibration ends', () => {
    usePoseProcessor.mockReturnValue({
      reps: 0,
      seconds: 15,
      feedback: "Perfect!",
      appState: 'WORKOUT',
      processFrame: mockProcessFrame,
    });
    const { getByText } = render(<LiveSessionScreen navigation={mockNavigation} route={{ params: { exerciseType: 'Plank' } }} />);
    expect(getByText('15s')).toBeTruthy();
  });

  test('ST-04: close button should work', () => {
    const { getByTestId } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByTestId('close-button'));
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('ST-05: skeleton color must change in incorrect form', () => {
    usePoseProcessor.mockReturnValue({
      reps: 0,
      seconds: 0,
      feedback: "Lower your hips!",
      appState: 'WORKOUT',
      processFrame: mockProcessFrame,
    });
    const { getByTestId, getAllByTestId } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByTestId('mock-mediapipe')); 
    
    const circles = getAllByTestId('svg-circle');
    expect(circles[0].props.fill).toBe('#FF0000');
  });

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
    usePoseProcessor.mockReturnValue({
      reps: 0,
      seconds: 45,
      feedback: "Looking good!",
      appState: 'WORKOUT',
      processFrame: mockProcessFrame,
    });
    const { getByText } = render(<LiveSessionScreen navigation={mockNavigation} route={{ params: { exerciseType: 'Plank' } }} />);
    expect(getByText('45s')).toBeTruthy();
  });

  test('ST-10: skeleton color must change in correct form', () => {
    usePoseProcessor.mockReturnValue({
      reps: 1,
      feedback: "Looking good!",
      appState: 'WORKOUT',
      processFrame: mockProcessFrame,
    });
    const { getByTestId, getAllByTestId } = render(<LiveSessionScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByTestId('mock-mediapipe'));
    
    const circles = getAllByTestId('svg-circle');
    expect(circles[0].props.fill).toBe('#00FF00');
  });
});