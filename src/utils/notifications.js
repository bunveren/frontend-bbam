import { Alert, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api";

const reminderKey = (planId) => `reminder_enabled_${planId}`;

// Persist whether a plan has an active reminder (survives app restarts)
export const saveReminderState = async (planId, isEnabled) => {
  try {
    await AsyncStorage.setItem(reminderKey(planId), isEnabled ? "1" : "0");
  } catch (e) {
    console.log("[Reminder] saveReminderState error:", e?.message);
  }
};

// Returns true if a reminder was previously saved as enabled for this plan
export const loadReminderState = async (planId) => {
  try {
    const val = await AsyncStorage.getItem(reminderKey(planId));
    return val === "1";
  } catch {
    return false;
  }
};

export const requestPermissionWithAlert = () => {
  return new Promise((resolve) => {
    Alert.alert(
      "Permission Required",
      "You have disabled notifications. Please enable them in Settings to get notified about your workouts.",
      [
        {
          text: "Cancel",
          onPress: () => resolve(false),
          style: "cancel",
        },
        {
          text: "Open Settings",
          onPress: async () => {
            await Linking.openSettings();
            resolve(true);
          },
        },
      ],
      { cancelable: false },
    );
  });
};

// schedule: { frequency: 'Daily'|'Weekly'|'Once', hour, minute, day (0=Mon..6=Sun), date }
export const scheduleLocalNotification = async (
  schedule,
  workoutName,
  planId,
) => {
  if (!schedule) return;

  // Ensure we have permission before scheduling
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    if (requested !== "granted") {
      console.log(
        "[Reminder] notification permission denied — skipping schedule",
      );
      return;
    }
  }

  // expo-notifications >=0.28 (SDK 50+) requires SchedulableTriggerInputTypes
  // Old { hour, minute, repeats } format silently fails in SDK 54
  let trigger;
  if (schedule.frequency === "Daily") {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: schedule.hour,
      minute: schedule.minute,
    };
  } else if (schedule.frequency === "Weekly") {
    // expo-notifications weekday: 1=Sun, 2=Mon ... 7=Sat
    // schedule.day: 0=Mon, 1=Tue ... 6=Sun  →  convert: day===6 ? 1 : day+2
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: schedule.day === 6 ? 1 : schedule.day + 2,
      hour: schedule.hour,
      minute: schedule.minute,
    };
  } else {
    // Once — fire at exact date+time
    const triggerDate = new Date(schedule.date);
    triggerDate.setHours(schedule.hour, schedule.minute, 0, 0);
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    };
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Workout Time! 🏋️‍♂️",
      body: `Ready for ${workoutName}?`,
      data: { planId },
      sound: true,
      ...(Platform.OS === "android" && { channelId: "workout-reminders" }),
    },
    trigger,
  });
};

// Fetches all active reminders from backend, cancels existing local notifications,
// and rebuilds the schedule. Called on silent REMINDER_SYNC push and on app foreground.
export const syncRemindersFromBackend = async () => {
  try {
    const { data: reminders } = await api.get("/notifications/reminders/");

    const frequencyMap = { daily: "Daily", weekly: "Weekly", once: "Once" };
    const activeReminders = reminders.filter((r) => r.is_active);

    // Build all triggers first — only cancel existing ones if rescheduling succeeds
    const scheduled = [];
    for (const reminder of activeReminders) {
      const [hourStr, minuteStr] = reminder.reminder_time.split(":");
      const schedule = {
        frequency: frequencyMap[reminder.recurrence] || "Daily",
        hour: parseInt(hourStr, 10),
        minute: parseInt(minuteStr, 10),
        day: reminder.recurrence_days?.[0] ?? 0,
        date: reminder.recurrence === "once" ? new Date() : null,
      };
      scheduled.push({ schedule, plan: reminder.plan });
    }

    // Cancel only after we have the new schedule ready
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const { schedule, plan } of scheduled) {
      await scheduleLocalNotification(schedule, "Your workout", plan);
    }
  } catch (e) {
    // silently fail — user may not be logged in or network unavailable
    console.log(
      "syncRemindersFromBackend skipped:",
      e?.response?.status ?? e?.message,
    );
  }
};
