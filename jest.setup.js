import 'react-native-gesture-handler/jestSetup';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}), { virtual: true });

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
