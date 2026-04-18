import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform, Linking, Alert, Modal } from "react-native";
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from "../../components/Button";
import TextInput from "../../components/TextInput";

import { useLogin, useRegister, useUpdateProfile } from "../../hooks/useAuth";
import api from "../../api";
import { requestPermissionWithAlert } from "../../utils/notifications";

const OnboardingScreen = ({ navigation }) => {
  const { mutateAsync: login, isPending: isLoginPending, error: loginError } = useLogin();
  const { mutateAsync: register } = useRegister();
  const { mutateAsync: updateProfile } = useUpdateProfile();

  // ===== LLD ATTRIBUTES =====
  const [currentView, setCurrentView] = useState("login"); // 'login' | 'signup' | 'setup'

  // inputs
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [genderInput, setGenderInput] = useState("male");

  // extra fields you already had in UI
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // LLD attributes (not used for now, but exist)
  const [errorMessage, setErrorMessage] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [deviceUuid, setDeviceUuid] = useState("");
  const [expoPushToken, setExpoPushToken] = useState("");
  const [userId, setUserId] = useState("");

  const isLogin = currentView === "login";
  const isSignup = currentView === "signup";
  const isSetup = currentView === "setup";

  useEffect(() => {
    setIsLoading(isLoginPending);
  }, [isLoginPending]);

  useEffect(() => {
    const setData = async () => {
      const uuid = Platform.OS === 'ios' ? await Application.getIosIdForVendorAsync() : Application.getAndroidId();
      setDeviceUuid(uuid);

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId
      });

      setExpoPushToken(tokenData.data);
    }
    setData();
  }, []);


  // ===== UI HELPERS =====
  const Divider = () => (
    <View className="flex-row items-center my-8">
      <View className="flex-1 h-[1px] bg-gray-300" />
      <Text className="mx-3 text-bbam-text-light m3-body-small">
        Or continue with
      </Text>
      <View className="flex-1 h-[1px] bg-gray-300" />
    </View>
  );

  const GoogleButton = () => (
    <View className="items-center">
      <TouchableOpacity
        activeOpacity={0.85}
        className="w-14 h-14 rounded-full items-center justify-center bg-red-500"
        onPress={() => {}}
      >
        <Text className="text-white font-bold text-lg">G</Text>
      </TouchableOpacity>
    </View>
  );

  // ===== LLD METHODS (EMPTY STUBS FOR NOW) =====
  const switchView = (view) => {
    setCurrentView(view);
  };

  const validateInputs = () => {
    setErrorMessage({});

    const isInDevelopment = false; // change to bypass in development
    if (isInDevelopment) {
      return true;
    }

    if (isSignup || isSetup) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput)) {
        setErrorMessage({ common: "Email is invalid" });
        return false;
      }

      if (!passwordInput || passwordInput.length < 8) {
        const msg = "Password should be at least 8 characters long";
        setErrorMessage({ common: msg });
        return false;
      }
    }

    if (isSignup && passwordInput !== confirmPasswordInput) {
      setErrorMessage({ signup: "Passwords do not match" });
      return false;
    }

    if (isSignup && !acceptedPolicy) {
      setErrorMessage({ signup: "Please accept the Privacy Policy to continue" });
      return false;
    }

    if (isSetup) {
      const numberRegex = /^\d+$/;
      const age = parseInt(ageInput);
      const height = parseInt(heightInput);
      const weight = parseInt(weightInput);

      if (!numberRegex.test(age) || isNaN(age) || age < 10 || age >= 100) {
        setErrorMessage({ setup: "Please enter a valid age (10-99)" });
        return false;
      }
      if (!numberRegex.test(height) || isNaN(height) || height < 50 || height > 250) {
        setErrorMessage({ setup :"Please enter a valid height (50-250 cm)" });
        return false;
      }
      if (!numberRegex.test(weight) || isNaN(weight) || weight < 20 || weight > 200) {
        setErrorMessage({ setup: "Please enter a valid weight (20-200 kg)" });
        return false;
      }
    }

    return true;
  };

  const registerDeviceWithBackend = async (user_id) => {
    try {
      const storageKey = `is_registered_${user_id}_${deviceUuid}`;
      const alreadyRegistered = await SecureStore.getItemAsync(storageKey);
      if (alreadyRegistered === 'true') return;
      console.log({ registerData: { user_id: user_id, device_uuid: deviceUuid, os_type: Platform.OS, expo_token: expoPushToken } });

      await api.post('/users/devices/', {
        user_id: user_id,
        os_type: Platform.OS,
        device_uuid: deviceUuid,
        expo_token: expoPushToken,
      });
  
      await SecureStore.setItemAsync(storageKey, 'true');
    } catch (error) {
      console.error("Error in device registration:", error);
    }
  };

  const handleLogin = async () => {
    if (validateInputs()) {
      await login({
        email: emailInput,
        password: passwordInput,
      }, {
        onSuccess: async (data) => {
          const preference = await SecureStore.getItemAsync('notif_preference');

          if (!preference) {
            const userWantsNotifs = await requestPermissionWithAlert();

            if (userWantsNotifs) {
              await SecureStore.setItemAsync('notif_preference', 'enabled');
            } else {
              await SecureStore.setItemAsync('notif_preference', 'disabled');
            }
          }

          await registerDeviceWithBackend(data.user_id);
        }
      });
    }
  };

  const doSignup = async () => {
    try {
      setIsLoading(true);
      const user = await register({
        email: emailInput,
        password: passwordInput,
      });
      setUserId(String(user.user_id));
      setIsLoading(false);
      switchView("setup");
    } catch (err) {
      setIsLoading(false);
      setErrorMessage({ signup: "Signup failed." });
    }
  };

  const handleSignup = async () => {
    if (!validateInputs()) return;

    const alreadySeen = await AsyncStorage.getItem('disclaimer_seen');
    if (alreadySeen !== '1') {
      setShowDisclaimer(true);
      return;
    }

    await doSignup();
  };

  const handleDisclaimerAccept = async () => {
    await AsyncStorage.setItem('disclaimer_seen', '1');
    setShowDisclaimer(false);
    await doSignup();
  };

  const handleSetupComplete = async () => {
    if (!validateInputs()) return;

    try {
      setIsLoading(true);

      // need to authorize first to send profile data
      await login({ email: emailInput, password: passwordInput });

      await updateProfile({
        user_id: userId,
        user_name: usernameInput,
        height_cm: Number(heightInput),
        weight_kg: Number(weightInput),
        age: Number(ageInput),
        gender: genderInput,
      });

      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      if (existingStatus !== 'granted') {
        const userWantsNotifs = await requestPermissionWithAlert();

        if (userWantsNotifs) {
          await SecureStore.setItemAsync('notif_preference', 'enabled');
        } else {
          await SecureStore.setItemAsync('notif_preference', 'disabled');
        }
      }

      await registerDeviceWithBackend(userId);
    
    } catch (err) {
      console.log({ setupErr: err });
      setErrorMessage({ setup: "Setup failed." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log({loginError});
  }, [loginError]);

  return (
    <View className="flex-1 bg-bbam-back-page">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===== HERO (LOGIN ONLY) ===== */}
        {isLogin && (
          <View className="w-full h-[300px] bg-bbam-back-card items-center justify-center">
            <View className="w-12 h-12 rounded-lg items-center justify-center mb-4 bg-bbam-indigo-main">
              <Text className="text-white font-bold">▢</Text>
            </View>

            <Text className="text-[34px] font-bold text-bbam-indigo-main">
              Body & Beyond
            </Text>
            <Text className="text-[22px] font-bold text-bbam-indigo-main -mt-1">
              AI Mentor
            </Text>
          </View>
        )}

        {/* ===== CONTENT ===== */}
        <View className="px-6" style={{ paddingTop: isLogin ? 28 : 64 }}>
          {/* ===== LOGIN ===== */}
          {isLogin && (
            <View className="mx-1.5">
              <Text className="text-[34px] font-bold text-center mb-7 text-bbam-text-main">
                Welcome!
              </Text>

              <TextInput
                label=""
                placeholder="Email Address"
                isPassword={false}
                value={emailInput}
                onChangeText={setEmailInput}
              />

              <TouchableOpacity className="items-end mt-2">
                <Text className="font-bold text-bbam-indigo-main">
                  Forgot password?
                </Text>
              </TouchableOpacity>

              <View className="mt-4">
                <TextInput
                  label=""
                  placeholder="Password"
                  isPassword={true}
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                />
              </View>

              <View className="mt-6">
                {loginError && (
                  <View className="bg-red-50 p-4 rounded-2xl mt-4 mb-4 border border-red-100">
                    <Text className="text-red-600 text-m3-body-small font-bold text-center">
                      Invalid username or password
                    </Text>
                  </View>
                )}
                <Button
                  title="Sign In"
                  variant="primary"
                  onPress={handleLogin}
                  className="py-5"
                  isLoading={isLoading}
                />
              </View>

              <Divider />
              <GoogleButton />

              <View className="flex-row justify-center mt-8">
                <Text className="text-bbam-text-light">
                  Don’t have an account?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    switchView("signup");
                    setErrorMessage({});
                  }}
                  hitSlop={15}
                >
                  <Text className="font-bold text-bbam-indigo-main">
                    Sign up
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ===== SIGNUP ===== */}
          {isSignup && (
            <View className="mx-1.5">
              <Text className="text-m3-headline-large font-bold text-center mb-10 text-bbam-text-main">
                Create an Account
              </Text>

              <Text className="text-m3-body-large font-bold mb-2 text-bbam-text-main">
                Username
              </Text>
              <TextInput
                label=""
                placeholder="username"
                isPassword={false}
                value={usernameInput}
                onChangeText={setUsernameInput}
              />

              <View className="mt-6" />
              <Text className="text-m3-body-large font-bold mb-2 text-bbam-text-main">
                Email Address
              </Text>
              <TextInput
                label=""
                placeholder="name@email.com"
                isPassword={false}
                value={emailInput}
                onChangeText={setEmailInput}
              />

              <View className="mt-6" />
              <Text className="text-m3-body-large font-bold mb-2 text-bbam-text-main">
                Password
              </Text>
              <TextInput
                label=""
                placeholder="Create a password"
                isPassword={true}
                value={passwordInput}
                onChangeText={setPasswordInput}
              />

              <View className="mt-2">
                <TextInput
                  label=""
                  placeholder="Confirm password"
                  isPassword={true}
                  value={confirmPasswordInput}
                  onChangeText={setConfirmPasswordInput}
                />
              </View>

              {/* Checkbox */}
              <TouchableOpacity
                className="flex-row items-center mt-6"
                activeOpacity={0.85}
                onPress={() => setAcceptedPolicy((v) => !v)}
              >
                <View
                  className={`w-8 h-8 rounded-lg border-2 items-center justify-center ${
                    acceptedPolicy
                      ? "bg-bbam-indigo-main border-bbam-indigo-main"
                      : "border-bbam-text-light"
                  }`}
                >
                  {acceptedPolicy && (
                    <Text className="text-white text-lg font-bold">✓</Text>
                  )}
                </View>
                <Text className="ml-4 text-m3-body-medium text-bbam-text-main flex-1">
                  By continuing, you agree to our{" "}
                  <Text
                    className="text-bbam-indigo-main font-bold"
                    onPress={() => navigation.navigate("PrivacyPolicy")}
                  >
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </TouchableOpacity>

              {(errorMessage.signup || errorMessage.common) && (
                <View className="bg-red-50 p-4 rounded-2xl mt-6 -mb-2 border border-red-100">
                  <Text className="text-red-600 text-m3-body-small font-bold text-center">
                    {errorMessage.signup || errorMessage.common}
                  </Text>
                </View>
              )}

              <View className="mt-8">
                <Button
                  title="Continue"
                  variant="primary"
                  onPress={handleSignup}
                  className="py-5"
                  isLoading={isLoading}
                  testID="signup-continue-button"
                />
              </View>

              <Divider />
              <GoogleButton />

              <View className="flex-row justify-center mt-8">
                <Text className="text-bbam-text-light">
                  Already have an account?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    switchView("login");
                    setErrorMessage({});
                  }}
                  hitSlop={15}
                >
                  <Text className="font-bold text-bbam-indigo-main">
                    Log in
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ===== SETUP ===== */}
          {isSetup && (
            <>
              <TouchableOpacity
                onPress={() => {
                  switchView("signup");
                  setUserId("");
                }}
                className="flex-row items-center mb-12"
              >
                <Text className="text-[28px] mr-2 text-bbam-indigo-main">
                  ‹
                </Text>
                <Text className="text-[20px] text-bbam-text-main">Back</Text>
              </TouchableOpacity>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.9}
                className="text-[34px] font-bold mb-10 text-bbam-text-main"
              >
                Set Up Your Account
              </Text>

              <Text className="text-[18px] font-bold mb-2 text-bbam-text-main">
                Age
              </Text>
              <TextInput
                label=""
                placeholder=""
                isPassword={false}
                value={ageInput}
                onChangeText={setAgeInput}
                keyboardType="number-pad"
              />

              <View className="mt-6" />
              <Text className="text-[18px] font-bold mb-2 text-bbam-text-main">
                Weight
              </Text>
              <TextInput
                label=""
                placeholder=""
                isPassword={false}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="number-pad"
              />

              <View className="mt-6" />
              <Text className="text-[18px] font-bold mb-2 text-bbam-text-main">
                Height
              </Text>
              <TextInput
                label=""
                placeholder=""
                isPassword={false}
                value={heightInput}
                onChangeText={setHeightInput}
                keyboardType="number-pad"
              />

              <View className="mt-8" />
              <Text className="text-[18px] font-bold mb-4 text-bbam-text-main">
                Gender
              </Text>

              <View className="flex-row">
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setGenderInput("male")}
                  className={`flex-1 py-3.5 rounded-2xl items-center mr-3 ${
                    genderInput === "male"
                      ? "bg-bbam-indigo-main"
                      : "bg-bbam-back-card"
                  }`}
                >
                  <Text
                    className={`text-[18px] font-bold ${
                      genderInput === "male"
                        ? "text-white"
                        : "text-bbam-indigo-main"
                    }`}
                  >
                    Male
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setGenderInput("female")}
                  className={`flex-1 py-3.5 rounded-2xl items-center ${
                    genderInput === "female"
                      ? "bg-bbam-indigo-main"
                      : "bg-bbam-back-card"
                  }`}
                >
                  <Text
                    className={`text-[18px] font-bold ${
                      genderInput === "female"
                        ? "text-white"
                        : "text-bbam-indigo-main"
                    }`}
                  >
                    Female
                  </Text>
                </TouchableOpacity>
              </View>

              {(errorMessage.setup || errorMessage.common) && (
                <View className="bg-red-50 p-4 rounded-2xl mt-6 -mb-2s border border-red-100">
                  <Text className="text-red-600 text-m3-body-small font-bold text-center">
                    {errorMessage.setup || errorMessage.common}
                  </Text>
                </View>
              )}

              <View className="mt-12">
                <Button
                  title="Sign Up"
                  variant="primary"
                  onPress={handleSetupComplete}
                  className="rounded-[28px] py-5"
                  isLoading={isLoading}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Disclaimer — shown only until the user dismisses it once */}
      <Modal visible={showDisclaimer} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full shadow-xl">
            <Text className="text-m3-headline-small font-bold text-bbam-text-main text-center mb-4">
              ⚠️ Important Notice
            </Text>
            <Text className="text-m3-body-medium text-bbam-text-main text-center leading-6 mb-2">
              Body & Beyond AI Mentor is a{" "}
              <Text className="font-bold">fitness guidance tool</Text> and is{" "}
              <Text className="font-bold">
                not a medical or healthcare application.
              </Text>
            </Text>
            <Text className="text-m3-body-medium text-bbam-text-light text-center leading-6 mb-6">
              It does not provide medical advice, diagnosis, or treatment.
              Always consult a qualified healthcare professional before
              starting any new exercise programme.
            </Text>
            <Button
              title="I Understand"
              variant="primary"
              onPress={handleDisclaimerAccept}
            />
          </View>
        </View>
      </Modal>

      <StatusBar style="auto" />
    </View>
  );
};

export default OnboardingScreen;
