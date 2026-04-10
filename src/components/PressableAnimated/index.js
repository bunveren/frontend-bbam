import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PressableAnimated = ({ children, onPress = () => {}, onPressIn = () => {}, onPressOut = () => {}, className, transform = false, fade = false, activeColor = 'white', baseColor = 'white', hitSlop, disabled, accessibilityRole, testID }) => {
  const isPressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    ...(fade ? { backgroundColor: withTiming(isPressed.value ? activeColor : baseColor, { duration: 100 }) } : {}),
    ...(transform ? { transform: [{ scale: withTiming(isPressed.value ? 0.95 : 1, { duration: 100 }) }] } : {})
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        isPressed.value = 1;
        onPressIn();
      }}
      onPressOut={() => {
        isPressed.value = 0;
        onPressOut();
      }}
      style={animatedStyle}
      className={className}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </AnimatedPressable>
  );
};

export default PressableAnimated;
