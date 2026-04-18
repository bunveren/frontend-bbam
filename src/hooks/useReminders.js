import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import api from '../api';

const pad = (n) => String(n).padStart(2, '0');
const recurrenceMap = { Daily: 'daily', Weekly: 'weekly', Once: 'once' };

const getDeviceUuid = () =>
  Platform.OS === 'ios'
    ? Application.getIosIdForVendorAsync()
    : Promise.resolve(Application.getAndroidId());

// Returns all active reminders from the backend.
// Each item: { id, plan, reminder_time, recurrence, recurrence_days, is_active }
export const useReminders = () =>
  useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/reminders/');
      return data;
    },
    refetchInterval: 30 * 1000, // poll every 30s — ensures cross-device sync without relying on silent push
  });

// Sends the reminder schedule to the backend and returns the created reminder object.
// planId: the workout plan's id
// schedule: { frequency, hour, minute, day (0=Mon..6=Sun), date }
export const useCreateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, schedule }) => {
      const deviceUuid = await getDeviceUuid();
      const payload = {
        plan: planId,
        reminder_time: `${pad(schedule.hour)}:${pad(schedule.minute)}:00`,
        recurrence: recurrenceMap[schedule.frequency] || 'once',
        recurrence_days: schedule.frequency === 'Weekly' ? [schedule.day] : null,
        sender_device_uuid: deviceUuid, // backend uses this to exclude sender from sync signal
      };

      const { data } = await api.post('/notifications/reminders/', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId) => {
      const deviceUuid = await getDeviceUuid();
      await api.delete(`/notifications/reminders/${reminderId}/`, {
        data: { sender_device_uuid: deviceUuid },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
};
