import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileSettingsScreen from '../screens/ProfileSettingsScreen';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';

jest.spyOn(Alert, 'alert');

const component = (
  <NavigationContainer>
    <ProfileSettingsScreen />
  </NavigationContainer>
);

describe('ProfileSettingsScreen', () => {
  it('UT-03: validates inputs and updates UI on successful save', async () => {
    render(component);

    fireEvent.press(screen.getByText(/edit/i));
    
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
  });
});
