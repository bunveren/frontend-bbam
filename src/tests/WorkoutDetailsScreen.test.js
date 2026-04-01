import React from 'react';
import { render } from './testUtils';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import WorkoutDetailsScreen from '../screens/WorkoutDetailsScreen';
import { NavigationContainer } from '@react-navigation/native';

const mockRoute = {
  params: {
    workoutPlan: {
      id: 'plan-123',
      name: 'Friday Burn',
      totalExercises: 7,
      estimatedDuration: 30,
    }
  }
};

const component = (
  <NavigationContainer>
    <WorkoutDetailsScreen route={mockRoute} navigation={{ navigate: jest.fn() }} />
  </NavigationContainer>
);

describe('WorkoutDetailsScreen UT-13', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('UT-13: transforms Weekly Saturday (day: 5) at 18:00 to Notification Weekday 7', async () => {
    render(component);

    // open the Modal
    fireEvent(screen.getByRole('switch'), 'onValueChange', true);

    // set the time explicitly to 18:00
    const timeRow = screen.getByText(/time/i);
    fireEvent.press(timeRow);

    const targetTime = new Date();
    targetTime.setHours(18, 0, 0, 0);

    const picker = screen.getByTestId('reminder-datetime-picker');
    fireEvent(picker, 'onChange', {
      nativeEvent: {
        timestamp: targetTime.getTime(),
      },
    }, targetTime);

    // select weekly and saturday
    fireEvent.press(screen.getByText(/weekly/i));
    const dayButtons = screen.getAllByText('S'); 
    fireEvent.press(dayButtons[0]);

    fireEvent.press(screen.getByText(/confirm schedule/i));

    await waitFor(() => {
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({
            weekday: 7,
            hour: 18,
            minute: 0,
            repeats: true,
          }),
        })
      );
    });
  });
});