import { useQueryClient } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { useEffect, useMemo, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import TextInput from '../../components/TextInput';
import { useUser, useUpdateProfile } from '../../hooks/useAuth';
import { getInitials } from '../../utils/general';
import { requestPermissionWithAlert } from '../../utils/notifications';

const SectionTitle = ({ children }) => (
  <Text className='text-m3-label-large font-bold text-bbam-text-main mb-3'>
    {children}
  </Text>
);

const Card = ({ children, className = '' }) => (
  <View className={`bg-white rounded-3xl p-5 shadow-sm ${className}`}>
    {children}
  </View>
);

const RowItem = ({ icon, title, subtitle, right, onPress }) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.7 : 1}
    onPress={onPress}
    className='flex-row items-center justify-between py-3'
  >
    <View className='flex-row items-center flex-1 pr-3'>
      <View className='w-10 h-10 rounded-2xl bg-bbam-back-card items-center justify-center mr-3'>
        <Ionicons name={icon} size={20} color='#585AD1' />
      </View>
      <View className='flex-1'>
        <Text className='text-m3-body-large font-bold text-bbam-text-main'>
          {title}
        </Text>
        {!!subtitle && (
          <Text className='text-m3-body-small text-bbam-text-light mt-0.5'>
            {subtitle}
          </Text>
        )}
      </View>
    </View>

    {/* RIGHT SIDE: keep it vertically centered */}
    <View className='items-center justify-center'>{right}</View>
  </TouchableOpacity>
);

const ProfileSettingsScreen = ({ navigation }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const [usernameInput, setUsernameInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [genderInput, setGenderInput] = useState("male");

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState({});

  const queryClient = useQueryClient();
  const { data: userData } = useUser();
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();

  useEffect(() => {
    loadProfile();
    setupNotificationListeners();
    setNotificationPreference();
  }, []);

  const initials = useMemo(() => getInitials(userProfile), [userProfile]);

  const setNotificationPreference = async () => {
    const preference = await SecureStore.getItemAsync('notif_preference');
    setNotificationsEnabled(preference === 'enabled');
  }

  // ===== METHODS (keep LLD shape; stubs are ok) =====
  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const storedEmail = await SecureStore.getItemAsync('userEmail');

      setUserProfile({
        user_name: userData.user_name,
        email: storedEmail,
        height_cm: userData.height_cm,
        weight_kg: userData.weight_kg,
        age: userData.age,
        gender: userData.gender
      });

      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
    }
  };

  const enableEdit = () => {
    if (!userProfile) return;

    setUsernameInput(userProfile.user_name ?? "");
    setHeightInput(String(userProfile.height_cm ?? ""));
    setWeightInput(String(userProfile.weight_kg ?? ""));
    setAgeInput(String(userProfile.age ?? ""));
    setGenderInput(userProfile.gender ?? "male");

    setEditMode(true);
    setHasUnsavedChanges(false);
    setErrorMessage({});
  };

  const validateInputs = () => {
    const age = parseInt(ageInput);
    const height = parseInt(heightInput);
    const weight = parseInt(weightInput);

    if (isNaN(age) || age < 10 || age >= 100) {
      Alert.alert("Invalid Age", "Please enter a valid age (10-99)");
      return false;
    }
    if (isNaN(height) || height < 50 || height > 250) {
      Alert.alert("Invalid Height", "Please enter a valid height (50-250 cm)");
      return false;
    }
    if (isNaN(weight) || weight < 20 || weight > 200) {
      Alert.alert("Invalid Weight", "Please enter a valid weight (20-200 kg)");
      return false;
    }
    if (!['male', 'female'].includes(genderInput)) {
      Alert.alert("Invalid Gender", "Please select a gender.");
      return false;
    }
    return true;
  };

  const handleSaveChanges = async () => {
    if (!validateInputs()) return;

    const updateData = {
      user_name: usernameInput,
      height_cm: Number(heightInput),
      weight_kg: Number(weightInput),
      age: Number(ageInput),
      gender: genderInput,
    }

    updateProfile(updateData, {
      onSuccess: () => {
        setUserProfile((prev) => ({
          ...prev,
          ...updateData
        }));
        setEditMode(false);
        setHasUnsavedChanges(false);
        Alert.alert("Success", "Profile updated successfully!");
      },
      onError: (error) => {
        console.log(error);
        setErrorMessage({ edit: "Failed to update profile." });
      }
    });
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setHasUnsavedChanges(false);
    setErrorMessage({});
  };

  const setupNotificationListeners = () => {
    // TODO later (silent push listener, etc.)
  };

  const toggleNotifications = async (enabled) => {
    // TODO later (update backend preference)
    // TODO IMPORTANT - on notif cancel cases we run Notifications.cancelAllScheduledNotificationsAsync to cancel local notifs. when user enables notifs again, should we get reminders from backend and set local notifications again??
    setNotificationsEnabled(enabled);
    if (enabled) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log({existingStatus});
      
      if (existingStatus === 'granted') {
        setNotificationsEnabled(true);
        await SecureStore.setItemAsync('notif_preference', 'enabled');
        return;
      }

      // If not granted, try requesting first
      const { status: requestStatus } = await Notifications.requestPermissionsAsync();
      
      if (requestStatus !== 'granted') {
        // User has previously blocked notifications, send to settings
        const result = await requestPermissionWithAlert();
        if (result === true) {
          // User intends to turn off notifs (pressed on go to settings) but we dont know if they actually turned it on
          // The AppState listener will catch them when they come back.
          await SecureStore.setItemAsync('notif_preference', 'enabled');
        } else {
          setNotificationsEnabled(false);
          await SecureStore.setItemAsync('notif_preference', 'disabled');
          await Notifications.cancelAllScheduledNotificationsAsync();
        }
      } else {
        setNotificationsEnabled(true);
        await SecureStore.setItemAsync('notif_preference', 'enabled');
      }
    } else {

      // Turning off is always immediate
      setNotificationsEnabled(false);
      await SecureStore.setItemAsync('notif_preference', 'disabled');
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  // helper method to sync system notification state with app's notification state
  const refreshNotificationState = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    const systemIsGranted = status === 'granted';
    
    const preference = await SecureStore.getItemAsync('notif_preference');
    const userWantsNotifs = preference === 'enabled';

    if (!systemIsGranted && userWantsNotifs) {
      // user turned notifs off from system settings, but the app thinks it's on
      // sync the app to off as well
      setNotificationsEnabled(false);
      await SecureStore.setItemAsync('notif_preference', 'disabled');
      await Notifications.cancelAllScheduledNotificationsAsync();
    } 
    else if (systemIsGranted && userWantsNotifs) {
      // Case: Everything matches.
      setNotificationsEnabled(true);
    }
    else {
      // user turned notifs off in the app.
      // we can't programmatically turn off system notif settings so ignore that part
      // even if system notif settings is granted, we keep the UI switch off.
      setNotificationsEnabled(false);
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // if the app comes back from the background/settings to the foreground
      if (nextAppState === 'active') {
        refreshNotificationState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleLogout = async () => {
    setErrorMessage({});
    try {
      // TODO later:
      // - cancel notifications (expo-notifications)

      setIsLoading(true);
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userId');
      await SecureStore.deleteItemAsync('userEmail');
      // force to login screen
      queryClient.setQueryData(['user'], null);
      queryClient.clear();
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
      console.log(e);
      setErrorMessage({ logout: "Failed to log out." });
    }
  };

  return (
    <View className="flex-1 bg-bbam-back-page">
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        <View className="px-6 pt-14">
          {/* HEADER */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-m3-headline-medium font-bold text-bbam-text-main">
              Profile
            </Text>

            {!editMode && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={enableEdit}
                className="flex-row items-center"
              >
                <Ionicons name="create-outline" size={18} color="#585AD1" />
                <Text className="ml-2 text-m3-body-medium font-bold text-bbam-indigo-main">
                  Edit
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* PROFILE CARD */}
          <Card className="mb-6">
            <View className="flex-row items-center">
              <View className="w-14 h-14 rounded-3xl bg-bbam-back-card items-center justify-center mr-4">
                <Text className="text-m3-title-small font-bold text-bbam-indigo-main">
                  {initials}
                </Text>
              </View>

              <View className="flex-1">
                <Text className="text-m3-body-large font-bold text-bbam-text-main">
                  {userProfile?.user_name || "—"}
                </Text>
                <Text className="text-m3-body-small text-bbam-text-light mt-0.5">
                  {userProfile?.email || "—"}
                </Text>
              </View>

              <View className="bg-bbam-back-card px-3 py-2 rounded-2xl">
                <Text className="text-m3-label-medium text-bbam-text-main">
                  {userProfile?.gender || "—"}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3 mt-5">
              <View className="flex-1 bg-bbam-back-card rounded-2xl p-4">
                <Text className="text-m3-label-medium text-bbam-text-light">
                  Age
                </Text>
                <Text className="text-m3-body-large font-bold text-bbam-text-main mt-1">
                  {userProfile?.age ?? "—"}
                </Text>
              </View>

              <View className="flex-1 bg-bbam-back-card rounded-2xl p-4">
                <Text className="text-m3-label-medium text-bbam-text-light">
                  Weight
                </Text>
                <Text className="text-m3-body-large font-bold text-bbam-text-main mt-1">
                  {userProfile?.weight_kg ?? "—"}{" "}
                  <Text className="text-m3-body-small text-bbam-text-light">
                    kg
                  </Text>
                </Text>
              </View>

              <View className="flex-1 bg-bbam-back-card rounded-2xl p-4">
                <Text className="text-m3-label-medium text-bbam-text-light">
                  Height
                </Text>
                <Text className="text-m3-body-large font-bold text-bbam-text-main mt-1">
                  {userProfile?.height_cm ?? "—"}{" "}
                  <Text className="text-m3-body-small text-bbam-text-light">
                    cm
                  </Text>
                </Text>
              </View>
            </View>
          </Card>

          {/* EDIT MODE */}
          {editMode ? (
            <>
              <SectionTitle>Edit Profile</SectionTitle>
              <Card className="mb-6">
                <TextInput
                  label="Username"
                  placeholder="username"
                  value={usernameInput}
                  onChangeText={(v) => {
                    setUsernameInput(v);
                    setHasUnsavedChanges(true);
                  }}
                />

                <View className="mt-4" />

                <TextInput
                  label="Age"
                  placeholder="Age"
                  value={ageInput}
                  onChangeText={(v) => {
                    setAgeInput(v);
                    setHasUnsavedChanges(true);
                  }}
                  keyboardType="number-pad"
                />

                <View className="mt-4" />

                <TextInput
                  label="Weight (kg)"
                  placeholder="Weight"
                  value={weightInput}
                  onChangeText={(v) => {
                    setWeightInput(v);
                    setHasUnsavedChanges(true);
                  }}
                  keyboardType="number-pad"
                />

                <View className="mt-4" />

                <TextInput
                  label="Height (cm)"
                  placeholder="Height"
                  value={heightInput}
                  onChangeText={(v) => {
                    setHeightInput(v);
                    setHasUnsavedChanges(true);
                  }}
                  keyboardType="number-pad"
                />

                <Text className="text-m3-label-large font-bold text-bbam-text-main mt-6 mb-3">
                  Gender
                </Text>

                <View className="flex-row">
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setGenderInput("male");
                      setHasUnsavedChanges(true);
                    }}
                    className={`flex-1 py-3.5 rounded-2xl items-center mr-3 ${
                      genderInput === "male"
                        ? "bg-bbam-indigo-main"
                        : "bg-bbam-back-card"
                    }`}
                  >
                    <Text
                      className={`text-m3-body-large font-bold ${
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
                    onPress={() => {
                      setGenderInput("female");
                      setHasUnsavedChanges(true);
                    }}
                    className={`flex-1 py-3.5 rounded-2xl items-center ${
                      genderInput === "female"
                        ? "bg-bbam-indigo-main"
                        : "bg-bbam-back-card"
                    }`}
                    testID="gender-button-female"
                  >
                    <Text
                      className={`text-m3-body-large font-bold ${
                        genderInput === "female"
                          ? "text-white"
                          : "text-bbam-indigo-main"
                      }`}
                    >
                      Female
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="mt-8">
                  <Button title="Save Changes" onPress={handleSaveChanges} isLoading={isUpdating} />
                </View>
                <View className="mt-3">
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={handleCancelEdit}
                  />
                </View>
                {errorMessage.edit && (
                  <Text className="mt-2 text-red-600 text-m3-body-small font-bold text-center">
                    {errorMessage.edit}
                  </Text>
                )}

                {hasUnsavedChanges && (
                  <Text className="text-m3-body-small text-bbam-text-light mt-4">
                    You have unsaved changes.
                  </Text>
                )}
              </Card>
            </>
          ) : (
            <>
              {/* VIEW MODE */}
              <SectionTitle>Preferences</SectionTitle>
              <Card className="mb-6">
                <RowItem
                  icon="notifications-outline"
                  title="Workout Reminders"
                  subtitle="Enable reminders for your workout plans"
                  right={
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={toggleNotifications}
                      trackColor={{ false: "#E5ECF3", true: "#585AD1" }}
                      thumbColor="white"
                      style={{
                        transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
                        marginTop: 2, // ✅ tiny iOS alignment fix
                      }}
                    />
                  }
                />
              </Card>

              <SectionTitle>Account</SectionTitle>
              <Card className="mb-10">
                <RowItem
                  icon="key-outline"
                  title="Change Password"
                  subtitle="Placeholder"
                  right={
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#9DA3A9"
                    />
                  }
                  onPress={() => {}}
                />
                <View className="h-[1px] bg-bbam-back-card" />
                <RowItem
                  icon="document-text-outline"
                  title="Privacy Policy"
                  subtitle="How we handle your data"
                  right={
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#9DA3A9"
                    />
                  }
                  onPress={() => navigation.navigate("PrivacyPolicy")}
                />
              </Card>

              <Button
                title="Logout"
                variant="primary"
                className="h-16"
                onPress={handleLogout}
                isLoading={isLoading}
              />

              {errorMessage.logout && (
                <Text className="text-red-600 text-m3-body-small font-bold text-center">
                  {errorMessage.logout}
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <StatusBar style="auto" />
    </View>
  );
};

export default ProfileSettingsScreen;
