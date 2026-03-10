import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../screens/OnboardingScreen';
import { NavigationContainer } from '@react-navigation/native';

global.fetch = jest.fn();

const component = (
  <NavigationContainer>
    <OnboardingScreen />
  </NavigationContainer>
);

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('UT-01: shows validation errors for invalid email and short password', () => {
    render(component);

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const signUpButton = screen.getByText(/sign up/i);

    fireEvent.changeText(emailInput, 'invalid_random_text');
    fireEvent.changeText(passwordInput, 'test');
    fireEvent.press(signUpButton);

    expect(screen.getByText(/email is invalid/i)).toBeTruthy();
    expect(screen.getByText(/password should be at least 8 characters long/i)).toBeTruthy();
  });

  it('UT-02: transitions to setup view after successful 200 OK response', async () => {
    // mocking a successful API response
    fetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ success: true, user: { id: '123' } }),
    });

    render(component);

    fireEvent.changeText(screen.getByPlaceholderText(/email/i), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText(/password/i), 'SecurePass123!');
    fireEvent.press(screen.getByText(/sign up/i));

    // wait for the UI to reflect the state change (setup view)
    await waitFor(() => {
      expect(screen.getByText(/complete your profile/i)).toBeTruthy(); 
    });
  });
});