import 'react-native-gesture-handler/jestSetup';
import { Alert } from 'react-native';

jest.spyOn(Alert, 'alert');

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');

  return {
    Ionicons: (props) => require('react').createElement(View, props),
    MaterialCommunityIcons: (props) => require('react').createElement(View, props),
    MaterialIcons: (props) => require('react').createElement(View, props),
  };
}, { virtual: true });

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({
  default: {
    addWhitelistedNativeProps: () => {},
    addWhitelistedConfigKeys: () => {},
  },
}), { virtual: true });

jest.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(null),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('fake-notification-id'),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'fake-token' }),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn().mockReturnValue({
    remove: jest.fn(),
  }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({
    remove: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset, // This stops the "No safe area value" error
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

jest.mock('expo-application', () => ({
  getIosIdForVendorAsync: jest.fn().mockResolvedValue('ios-uuid'),
  getAndroidId: jest.fn().mockReturnValue('android-uuid'),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
}));

jest.mock('./src/api', () => ({
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue('fake-token'),
  setItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(null),
}));