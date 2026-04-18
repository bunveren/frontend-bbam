import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator  } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import WorkoutDetailsScreen from '../screens/WorkoutDetailsScreen';
import WorkoutEditScreen from '../screens/WorkoutEditScreen';
import LiveSessionScreen from '../screens/LiveSessionScreen/index';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

import { useUser } from '../hooks/useAuth';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { data: user, isLoading } = useUser();
  const isLoggedIn = !!(user && user.user_name && user.height_cm && user.weight_kg && user.age && user.gender);


  if (isLoading) {
    return (
      <View className='flex-1 items-center justify-center'>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <>
          <Stack.Screen name="Login" component={OnboardingScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ animation: 'slide_from_bottom' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} options={{ gestureEnabled: false }} />
          <Stack.Screen
            name="WorkoutDetails" 
            component={WorkoutDetailsScreen} 
            options={({ route }) => ({
              headerShown: false,
              animation: 'slide_from_right',
              animationTypeForReplace: route.params?.fromEdit ? 'pop' : 'push'
            })}
          />
          <Stack.Screen
            name="WorkoutEdit" 
            component={WorkoutEditScreen} 
            options={{
              presentation: 'fullScreenModal',
              animation: 'slide_from_right'
            }}
          />
          <Stack.Screen
            name="LiveSession"
            component={LiveSessionScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ animation: 'slide_from_bottom' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default RootNavigator;
