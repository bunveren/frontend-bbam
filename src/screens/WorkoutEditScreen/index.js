import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import uuid from "react-native-uuid";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";

import TextInput from "../../components/TextInput";
import Button from "../../components/Button";
import CardItem from "../../components/CardItem";
import ReminderSection from "../../components/ReminderSection";

import { useExerciseLibrary } from "../../hooks/useExerciseLibrary";
import api from "../../api";

import { mapWorkoutsToInternalStructure } from "../../utils/general";
import exerciseRules from "../../utils/rules.json";

const WorkoutEditScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: library, isLoading: isLibLoading } = useExerciseLibrary();

  // LLD attributes
  const { editMode, workout = {} } = route.params || {};
  const { id: planId } = workout;
  const [planName, setPlanName] = useState(editMode ? workout.name : "");
  const [initialExercises, setInitialExercises] = useState(
    editMode ? JSON.stringify(workout.exerciseList) : "[]",
  );
  const [availableExercises, setAvailableExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState(
    editMode
      ? workout.exerciseList.map((ex) => ({ ...ex, instanceId: uuid.v4() }))
      : [],
  );
  const [isLocalAlarmScheduled, setIsLocalAlarmScheduled] = useState(
    workout?.isReminderEnabled || false,
  );
  const [currentSchedule, setCurrentSchedule] = useState(
    workout?.schedule || null,
  );
  const [reminderFrequency, setReminderFrequency] = useState("Daily");
  const [reminderTime, setReminderTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // LLD methods

  const loadExerciseLibrary = () => {
    if (library) {
      setAvailableExercises(Object.values(library));
    }
  };

  useEffect(() => {
    loadExerciseLibrary();
  }, [library]);

  const addExercise = (exercise) => {
    const newEntry = {
      ...exercise,
      instanceId: uuid.v4(), // unique ID for draggable list
      value: "1",
    };
    setSelectedExercises([...selectedExercises, newEntry]);
  };

  const removeExercise = useCallback((instanceId) => {
    setSelectedExercises((prev) =>
      prev.filter((ex) => ex.instanceId !== instanceId),
    );
  }, []);

  const reorderExercises = (newData) => {
    setSelectedExercises(newData);
  };

  const duplicateExercise = useCallback((instanceId) => {
    const index = selectedExercises.findIndex(
      (ex) => ex.instanceId === instanceId,
    );
    if (index === -1) return;

    const originalItem = selectedExercises[index];

    const clonedItem = {
      ...originalItem,
      instanceId: uuid.v4(),
    };

    setSelectedExercises((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, clonedItem);
      return copy;
    });
  }, []);

  const updateExerciseDetails = useCallback((instanceId, diff) => {
    setSelectedExercises((prev) =>
      prev.map((ex) => {
        if (ex.instanceId === instanceId) {
          const newValue = Math.max(1, parseInt(ex.value || 0) + diff);
          return {
            ...ex,
            value: newValue.toString(),
          };
        }
        return ex;
      }),
    );
  }, []);

  const scheduleLocalNotification = async () => {
    if (!currentSchedule) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    let trigger;
    if (currentSchedule.frequency === "Daily") {
      trigger = {
        hour: currentSchedule.hour,
        minute: currentSchedule.minute,
        repeats: true,
      };
    } else if (currentSchedule.frequency === "Weekly") {
      // expo-notifications uses 1 for Sunday, 7 for Saturday. UI uses 0 for Monday, 6 for Sunday
      trigger = {
        weekday: currentSchedule.day === 6 ? 1 : currentSchedule.day + 2,
        hour: currentSchedule.hour,
        minute: currentSchedule.minute,
        repeats: true,
      };
    } else {
      // One-time notification
      const triggerDate = new Date(currentSchedule.date);
      triggerDate.setHours(currentSchedule.hour, currentSchedule.minute, 0);
      trigger = triggerDate;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Workout Time! 🏋️‍♂️",
        body: `Ready for ${workoutPlan.name}?`,
        data: { planId: workoutPlan.id },
      },
      trigger,
    });
  };

  const hasExercisesChanged = () => {
    const currentFormat = selectedExercises.map(({ instanceId, ...rest }) => ({
      ...rest,
      value: Number(rest.value),
    }));
    console.log({
      current: JSON.stringify(currentFormat),
      initial: initialExercises,
      isSame: JSON.stringify(currentFormat) === initialExercises,
    });
    return JSON.stringify(currentFormat) !== initialExercises;
  };

  const validatePlan = () => {
    if (!planName.trim()) {
      Alert.alert("Error", "Please enter a workout title.");
      return false;
    }
    if (selectedExercises.length === 0) {
      Alert.alert("Error", "Please add at least one exercise.");
      return false;
    }
    return true;
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleSave = async () => {
    if (!validatePlan()) return;

    setIsLoading(true);
    try {
      const finalPlan = {
        name: planName,
        exercises: selectedExercises,
        isReminderEnabled: isLocalAlarmScheduled,
        schedule: currentSchedule,
      };

      console.log("Saving Plan:", finalPlan);

      const exercisesChanged = hasExercisesChanged();
      const payload = { plan_name: planName };
      if (exercisesChanged) {
        payload.items = selectedExercises.map((exercise, index) => ({
          exercise_id: exercise.id,
          step_order: index + 1,
          [exercise.mode === "reps" ? "target_reps" : "target_seconds"]:
            exercise.value,
        }));
      }

      //todo set notifications
      let response;
      if (editMode && planId) {
        response = await api.patch(`/workout/plans/${planId}/`, payload);
      } else {
        response = await api.post("/workout/plans/", payload);
      }

      console.log({ resp: response.data });
      const newWorkoutData = mapWorkoutsToInternalStructure([response.data])[0];
      if (exercisesChanged && response.data.id !== planId) {
        setInitialExercises(newWorkoutData.exerciseList);
      }

      queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
      navigation.dispatch(
        CommonActions.reset({
          index: 1, // This makes the second item in 'routes' the active screen
          routes: [
            { name: "MainTabs" },
            {
              name: "WorkoutDetails",
              params: {
                workoutPlan: newWorkoutData,
                fromEdit: true,
              },
            },
          ],
        }),
      );
    } catch (error) {
      console.log({ workoutSaveError: error });
      Alert.alert("Save Failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = useCallback(
    ({ item, drag, isActive }) => (
      <ScaleDecorator>
        <View
          key={item.instanceId}
          style={{
            marginBottom: 8,
            //paddingHorizontal: 24,
            opacity: isActive ? 0.8 : 1,
          }}
          testID="selected-exercise-card"
        >
          <CardItem
            title={item.name}
            subtitle={item.value}
            exerciseCountType={item.mode === "reps" ? "Reps" : "Seconds"}
            variant="exerciseEdit"
            onDelete={() => removeExercise(item.instanceId)}
            onCopy={() => duplicateExercise(item.instanceId)}
            onDrag={drag}
            onUpdateCount={(diff) =>
              updateExerciseDetails(item.instanceId, diff)
            }
          />
        </View>
      </ScaleDecorator>
    ),
    [removeExercise, duplicateExercise, updateExerciseDetails],
  );

  return (
    <View
      className="flex-1 bg-bbam-back-page"
      style={{ paddingTop: insets.top }}
    >
      <View className="px-6 flex-row items-center justify-between py-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2"
        >
          <Ionicons name="chevron-back" size={30} color="#585AD1" />
        </TouchableOpacity>
        <Text className="text-m3-headline-small font-bold text-bbam-text-main">
          {editMode ? "Edit Workout" : "Create New Workout"}
        </Text>
        <View className="w-10" />
      </View>

      <View style={{ flex: 1 }}>
        {/* Exercise Library  */}
        <View className="px-6 mb-4">
          <TextInput
            label="Workout Plan Title"
            placeholder="e.g. My Morning Routine"
            value={planName}
            onChangeText={setPlanName}
          />
        </View>

        <Text className="text-m3-label-large font-bold text-bbam-text-main px-6 mb-3">
          Add Exercises
        </Text>

        <View className="h-64 max-h-64 mx-4 pb-4 border-b-[0.5px] border-[#D4D6DD]">
          {isLibLoading ? (
            <View className="flex-1 justify-center">
              <ActivityIndicator
                color="#585AD1"
                size="large"
                className="mt-10"
              />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator>
              <View className="gap-2">
                {availableExercises.map((ex) => (
                  <CardItem
                    key={`exercise-${ex.id}`}
                    title={ex.name}
                    variant="exerciseAdd"
                    onAdd={() => addExercise(ex)}
                  />
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <Text className="text-m3-label-large font-bold text-bbam-text-main px-6 my-3">
          Current Plan
        </Text>

        {/* Current Plan */}
        <View className="flex-1 mx-4">
          <DraggableFlatList
            data={selectedExercises}
            onDragEnd={({ data }) => reorderExercises(data)}
            keyExtractor={(item) => item.instanceId}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingBottom: 10,
              backgroundColor: "#F8FAFC",
            }}
            activationDistance={20}
            showsVerticalScrollIndicator={true}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-8 bg-white/30 rounded-2xl border border-dashed border-bbam-text-light/30">
                <Ionicons
                  name="fitness-outline"
                  size={48}
                  color="#9DA3A9"
                  className="mb-2"
                />
                <Text className="text-m3-body-medium text-bbam-text-light text-center">
                  Add an exercise to get started
                </Text>
              </View>
            }
            testID="draggable-exercise-list"
          />
        </View>
      </View>

      <View
        className="bg-white rounded-t-[32px] px-6 pt-8 shadow-2xl"
        style={{ paddingBottom: insets.bottom + 10 }}
      >
        <ReminderSection
          isScheduled={isLocalAlarmScheduled}
          onToggle={setIsLocalAlarmScheduled}
          onScheduleUpdate={setCurrentSchedule}
          reminderTime={reminderTime}
          setReminderTime={setReminderTime}
          frequency={reminderFrequency}
          setFrequency={setReminderFrequency}
        />

        <View className="flex-row gap-3 mt-4">
          <View className="flex-1">
            <Button
              className="h-16"
              title={isLoading ? "Saving..." : "Save"}
              onPress={handleSave}
            />
          </View>
          {editMode && (
            <View className="flex-1">
              <Button
                className="h-16"
                title="Cancel"
                variant="secondary"
                onPress={handleCancel}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default WorkoutEditScreen;
