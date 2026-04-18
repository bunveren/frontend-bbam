import { NavigationContainer } from '@react-navigation/native';
import { useFonts, Roboto_400Regular, Roboto_500Medium } from '@expo-google-fonts/roboto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator, AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import RootNavigator from './navigation/RootNavigator';
import { syncRemindersFromBackend } from './utils/notifications';
import '../global.css';

// Required: without this, notifications are silently dropped when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Android 8+ requires a notification channel — without this notifications never appear
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('workout-reminders', {
    name: 'Workout Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: true,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // data stays fresh for 5 mins
    },
  },
});

export default function App() {
  let [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
  });

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Silent push listener: backend sends { type: 'REMINDER_SYNC' } to sync reminders across devices
    const notifSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const { type } = notification.request.content.data || {};
      if (type === 'REMINDER_SYNC') {
        syncRemindersFromBackend();
      }
    });

    // Foreground sync: re-sync reminders whenever app comes to foreground
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        syncRemindersFromBackend();
      }
      appState.current = nextState;
    });

    return () => {
      notifSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View className='flex-1 items-center justify-center'>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>   
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
