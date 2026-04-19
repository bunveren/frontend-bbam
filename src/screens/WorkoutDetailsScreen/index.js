import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import CardItem from "../../components/CardItem";
import Button from "../../components/Button";
import PressableAnimated from "../../components/PressableAnimated";
import ReminderSection from "../../components/ReminderSection";
import { createSession } from "../../services/trackingService";
import api from "../../api";
import {
  scheduleLocalNotification,
  saveReminderState,
  loadReminderState,
} from "../../utils/notifications";
import {
  useReminders,
  useCreateReminder,
  useDeleteReminder,
} from "../../hooks/useReminders";

const WorkoutDetailsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [exerciseList, setExerciseList] = useState(null);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [reminderFrequency, setReminderFrequency] = useState("Daily");
  const [isLocalAlarmScheduled, setIsLocalAlarmScheduled] = useState(false);
  const [reminderId, setReminderId] = useState(null);

  const { mutateAsync: createReminder } = useCreateReminder();
  const { mutateAsync: deleteReminder } = useDeleteReminder();
  const { data: reminders } = useReminders();

  const { workoutPlan } = route.params;
  const { id: planId, totalExercises, estimatedDuration } = workoutPlan;

  useEffect(() => {
    setExerciseList(workoutPlan.exerciseList || []);
  }, [workoutPlan]);

  // Load persisted reminder state immediately from AsyncStorage (no network needed)
  useEffect(() => {
    loadReminderState(planId).then((enabled) => {
      setIsLocalAlarmScheduled(enabled);
    });
  }, [planId]);

  // Sync reminder state from backend when reminders list loads
  useEffect(() => {
    if (!reminders) return;
    const existing = reminders.find(
      (r) => String(r.plan) === String(planId) && r.is_active,
    );
    const enabled = !!existing;
    setIsLocalAlarmScheduled(enabled);
    setReminderId(existing?.id ?? null);
    saveReminderState(planId, enabled);

    if (existing) {
      const [hourStr, minuteStr] = existing.reminder_time.split(":");
      const restored = new Date();
      restored.setHours(parseInt(hourStr, 10), parseInt(minuteStr, 10), 0, 0);
      setReminderTime(restored);
      const freqMap = { daily: "Daily", weekly: "Weekly", once: "Once" };
      setReminderFrequency(freqMap[existing.recurrence] || "Daily");
    }
  }, [reminders, planId]);

  const handleStartWorkout = async () => {
    const { id: sessionId } = await createSession(planId, workoutPlan.name, new Date());
    navigation.navigate("LiveSession", { exerciseList, sessionId, planName: workoutPlan.name });
  };

  const handleEditWorkout = () => {
    navigation.navigate("WorkoutEdit", {
      editMode: true,
      workout: { ...workoutPlan, exerciseList },
    });
  };

  const handleDeleteWorkout = () => {
    Alert.alert(
      "Delete Workout",
      "Are you sure you want to delete this workout plan? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/workout/plans/${planId}/`);
              queryClient.invalidateQueries({ queryKey: ["workoutPlans"] });
              navigation.goBack();
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to delete the workout plan.");
            }
          },
        },
      ],
    );
  };

  // Called by ReminderSection when the switch is toggled
  const handleToggle = async (value) => {
    setIsLocalAlarmScheduled(value);
    await saveReminderState(planId, value);
    if (!value) {
      if (reminderId) {
        try {
          await deleteReminder(reminderId);
        } catch (e) {
          console.log("deleteReminder error:", e);
        }
        setReminderId(null);
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  // Called by ReminderSection when user confirms the schedule in the modal
  const handleScheduleConfirmed = async (scheduleData) => {
    if (!scheduleData) return;

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await scheduleLocalNotification(scheduleData, workoutPlan.name, planId);
      await saveReminderState(planId, true);
    } catch (e) {
      console.log("[Reminder] local notification error:", e?.message);
    }

    try {
      if (reminderId) {
        await deleteReminder(reminderId);
        setReminderId(null);
      }
      const result = await createReminder({ planId, schedule: scheduleData });
      setReminderId(result.id);
    } catch (e) {
      console.log(
        "[Reminder] backend save skipped:",
        e?.response?.status ?? e?.message,
      );
    }
  };

  return (
    <View
      className="flex-1 bg-bbam-back-page"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1 px-6 gap-8">
        {/* Header */}
        <View className="flex-row justify-between items-center pt-4">
          <PressableAnimated
            onPress={() => navigation.goBack()}
            hitSlop={15}
            transform
            className="p-2 -ml-2"
          >
            <Ionicons name="chevron-back" size={30} color="#585AD1" />
          </PressableAnimated>

          <Text className="text-m3-headline-small text-bbam-text-main">
            {workoutPlan.name}
          </Text>

          <View className="flex-row items-center">
            <PressableAnimated
              onPress={handleDeleteWorkout}
              hitSlop={15}
              transform
              className="p-2"
            >
              <Ionicons name="trash-outline" size={26} color="#ED3241" />
            </PressableAnimated>

            <PressableAnimated
              onPress={handleEditWorkout}
              hitSlop={15}
              transform
              className="p-2 -mr-2"
            >
              <MaterialCommunityIcons name="pencil" size={26} color="#585AD1" />
            </PressableAnimated>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row gap-4 pb-8 border-b-[0.5px] border-[#D4D6DD]">
          <View className="flex-1 bg-bbam-back-card py-4 rounded-3xl items-center justify-center h-24">
            <MaterialCommunityIcons name="dumbbell" size={24} color="#585AD1" />
            <Text className="text-m3-title-small font-bold mt-1">{`${totalExercises} Exercise${totalExercises > 1 ? "s" : ""}`}</Text>
          </View>
          <View className="flex-1 bg-bbam-back-card py-4 rounded-3xl items-center justify-center h-24">
            <Ionicons name="time" size={24} color="#585AD1" />
            <Text className="text-m3-title-small font-bold mt-1">{`${estimatedDuration} Minute${estimatedDuration < 2 ? "" : "s"}`}</Text>
          </View>
        </View>

        {/* Exercise List */}
        <ScrollView
          vertical
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="flex-col gap-2"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {exerciseList?.map((item, index) => (
            <CardItem
              key={`${item.id}-${index}`}
              title={item.name}
              subtitle={`${item.value} ${item.mode === "reps" ? "Reps" : "Seconds"}`}
              variant="exerciseDisplay"
            />
          ))}
        </ScrollView>
      </View>

      {/* Reminders & Start Button */}
      <View
        className="bg-white rounded-t-[32px] px-6 pt-8 shadow-lg"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <ReminderSection
          isScheduled={isLocalAlarmScheduled}
          onToggle={handleToggle}
          onScheduleUpdate={handleScheduleConfirmed}
          reminderTime={reminderTime}
          setReminderTime={setReminderTime}
          frequency={reminderFrequency}
          setFrequency={setReminderFrequency}
        />

        <Button
          title="Start Workout"
          variant="primary"
          className="h-16"
          onPress={handleStartWorkout}
        />
      </View>
    </View>
  );
};

export default WorkoutDetailsScreen;
