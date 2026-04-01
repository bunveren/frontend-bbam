import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CardItem from '../../components/CardItem';
import Button from '../../components/Button';
import PressableAnimated from '../../components/PressableAnimated';
import ReminderSection from '../../components/ReminderSection';
import { createSession } from '../../services/trackingService';

const WorkoutDetailsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();

  // these are not on lld. used for the datetimepicker
  const [exerciseList, setExerciseList] = useState(null);
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [reminderFrequency, setReminderFrequency] = useState('Daily'); // Daily, Weekly, Once

  // mock attributes and methods according to lld
  const [isLocalAlarmScheduled, setIsLocalAlarmScheduled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { workoutPlan } = route.params;
  const { id: planId, totalExercises, estimatedDuration } = workoutPlan;

  const loadWorkoutPlan = (planId) => {
    setExerciseList(workoutPlan.exerciseList || []);
  };
  const handleStartWorkout = () => {
    console.log('pressed Start Workout');
    navigation.navigate('LiveSession');
  };
  const handleEditWorkout = () => {
    navigation.navigate('WorkoutEdit', { editMode: true, workout: { ...workoutPlan, exerciseList} });
  };

  const handleSetReminder = () => {
    setIsLocalAlarmScheduled(previousState => !previousState);
  };

  const scheduleLocalNotification = async () => { // not sure if this works yet
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!currentSchedule) return;

    let trigger;
    if (currentSchedule.frequency === 'Daily') {
      trigger = { hour: currentSchedule.hour, minute: currentSchedule.minute, repeats: true };
    } else if (currentSchedule.frequency === 'Weekly') {
      // expo-notifications uses 1 for Sunday, 7 for Saturday. UI uses 0 for Monday, 6 for Sunday
      trigger = { weekday: (currentSchedule.day === 6 ? 1 : currentSchedule.day + 2), hour: currentSchedule.hour, minute: currentSchedule.minute, repeats: true };
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
      trigger
    });
  };

  const calculateDuration = () => {};

  useEffect(() => {
    console.log(currentSchedule);
  }, [currentSchedule]);

  useEffect(() => {
    if (currentSchedule && isLocalAlarmScheduled) {
      scheduleLocalNotification();
    }
  }, [currentSchedule, isLocalAlarmScheduled]);

  useEffect(() => {
    loadWorkoutPlan();
  }, [workoutPlan]);

  return (
    <View className="flex-1 bg-bbam-back-page" style={{ paddingTop: insets.top }}>
      <View className="flex-1 px-6 gap-8">
        {/* Header */}
        <View className="flex-row justify-between items-center pt-4">
          <PressableAnimated onPress={() => navigation.goBack()} hitSlop={15} transform className="p-2 -ml-2">
            <Ionicons name="chevron-back" size={30} color="#585AD1" />
          </PressableAnimated>
          
          <Text className="text-m3-headline-small text-bbam-text-main">
            {workoutPlan.name}
          </Text>
          
          <PressableAnimated onPress={handleEditWorkout} hitSlop={15} transform className="p-2 -mr-2">
            <MaterialCommunityIcons name="pencil" size={30} color="#585AD1" />
          </PressableAnimated>
        </View>

        {/* Stats */}
        <View className="flex-row gap-4 pb-8 border-b-[0.5px] border-[#D4D6DD]">
          <View className="flex-1 bg-bbam-back-card py-4 rounded-3xl items-center justify-center h-24">
            <MaterialCommunityIcons name="dumbbell" size={24} color="#585AD1" />
            <Text className="text-m3-title-small font-bold mt-1">{`${totalExercises} Exercise${totalExercises > 1 ? 's' : ''}`}</Text>
          </View>
          <View className="flex-1 bg-bbam-back-card py-4 rounded-3xl items-center justify-center h-24">
            <Ionicons name="time" size={24} color="#585AD1" />
            <Text className="text-m3-title-small font-bold mt-1">{`${estimatedDuration} Minutes`}</Text>
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
          {exerciseList?.map((item) => (
            <CardItem 
              key={item.id}
              title={item.name}
              subtitle={`${item.value} ${item.mode === 'reps' ? 'Reps' : 'Seconds'}`}
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
          onScheduleUpdate={setCurrentSchedule}
          onToggle={handleSetReminder}
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
