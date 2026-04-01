import React from 'react';
import { render } from './testUtils';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import ProfileSettingsScreen from '../screens/ProfileSettingsScreen';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import api from '../api';

jest.spyOn(Alert, 'alert');
SecureStore.getItemAsync.mockImplementation((key) => {
  if (key === 'userEmail') return Promise.resolve('test@example.com');
  return Promise.resolve(null);
});

const component = (
  <NavigationContainer>
    <ProfileSettingsScreen />
  </NavigationContainer>
);

jest.mock('../api');

describe('ProfileSettingsScreen', () => {
  let queryClient;

  beforeEach(() => {
    jest.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('UT-03: validates inputs and updates UI on successful save', async () => {
    queryClient.setQueryData(['user'], {
      user_name: 'Test User',
      age: 25,
      height_cm: 160,
      weight_kg: 50,
      gender: 'female'
    });

    api.patch.mockResolvedValue({
      status: 200,
      data: {
        user_name: 'Test User',
        age: 22,
        height_cm: 170,
        weight_kg: 60,
        gender: 'female'
      }
    });

    const { unmount } = render(component, { queryClient });
    await waitFor(() => {
      expect(SecureStore.getItemAsync).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeTruthy();
    });

    fireEvent.press(screen.getByText(/edit/i));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/age/i)).toBeTruthy();
    });
    
    const ageInput = screen.getByPlaceholderText(/age/i);
    const heightInput = screen.getByPlaceholderText(/height/i);
    const weightInput = screen.getByPlaceholderText(/weight/i);
    const femaleButton = screen.getByTestId('gender-button-female');

    fireEvent.changeText(ageInput, '22');
    fireEvent.changeText(heightInput, '170');
    fireEvent.changeText(weightInput, '60');
    fireEvent.press(femaleButton);

    fireEvent.press(screen.getByText(/save changes/i));

    await waitFor(() => {
      expect(screen.queryByText(/edit profile/i)).toBeNull();
      
      expect(screen.getByText(/22/)).toBeTruthy();
      expect(screen.getByText(/170/)).toBeTruthy();
      expect(screen.getByText(/60/)).toBeTruthy();
      expect(screen.getByText(/female/i)).toBeTruthy();
    });

    unmount();
  });
});
