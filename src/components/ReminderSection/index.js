import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Switch, Modal, Animated, Dimensions, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Button from '../Button';
import PressableAnimated from '../PressableAnimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ReminderSection = ({ 
  isScheduled,
  onScheduleUpdate,
  onToggle, 
  reminderTime, 
  setReminderTime, 
  frequency,
  setFrequency 
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const FrequencyButton = ({ label, value }) => (
    <TouchableOpacity
      onPress={() => setFrequency(value)}
      className={`flex-1 py-3 rounded-2xl items-center border ${
        frequency === value ? 'bg-bbam-indigo-main border-bbam-indigo-main' : 'bg-bbam-back-card border-transparent'
      }`}
    >
      <Text className={`font-bold ${frequency === value ? 'text-white' : 'text-bbam-text-main'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const openModal = () => {
    setIsModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setIsModalVisible(false));
  };

  const handleToggle = (value) => {
    onToggle(value);
    if (value) {
      openModal();
    } else {
      onScheduleUpdate(null);
    }
  };

  const getReminderSubtitle = () => {
    if (!isScheduled) return 'Off';
    
    let dayText = frequency;
    if (frequency === 'Weekly') {
      // reminderTime.getDay() gives the index 0-6
      dayText = `Every ${DAYS[reminderTime.getDay()]}`;
    } else if (frequency === 'Once') {
      const month = MONTHS[reminderTime.getMonth()];
      const date = reminderTime.getDate();
      dayText = `${month} ${date}`;
    }
    
    const timeText = reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dayText}, ${timeText}`;
  };

  const handleConfirm = () => {
    const scheduleData = {
      frequency, // 'Daily', 'Weekly', 'Once'
      hour: reminderTime.getHours(),
      minute: reminderTime.getMinutes(),
      // day index (0-6) for 'Weekly', full Date for 'Once'
      day: frequency === 'Weekly' ? reminderTime.getDay() : null,
      date: frequency === 'Once' ? reminderTime : null,
      repeats: frequency !== 'Once',
    };

    onScheduleUpdate(scheduleData);
    closeModal();
  };

  return (
    <View>
      <View className="flex-row justify-between items-center mb-8">
        <TouchableOpacity 
          onPress={() => isScheduled && openModal()} 
          className="ml-2 flex-1"
          disabled={!isScheduled}
        >
          <Text className="text-m3-body-medium font-bold text-bbam-text-main">Reminders</Text>
          <Text className={`text-m3-body-small ${isScheduled ? 'text-bbam-text-main' : 'text-bbam-text-light'}`}>
            {getReminderSubtitle()}
          </Text>
        </TouchableOpacity>
        
        <Switch
          trackColor={{ false: '#E5ECF3', true: '#585AD1' }}
          thumbColor="white"
          onValueChange={handleToggle}
          value={isScheduled}
          hitSlop={20}
        />
      </View>

      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View className="flex-1 bg-black/50 justify-end">
          <Pressable className="absolute inset-0" onPress={() => {closeModal}} />
          
          <Animated.View 
            style={{ transform: [{ translateY: slideAnim }] }}
            className="bg-white rounded-t-[32px] p-6 pb-12 shadow-2xl"
          >
            <Text className="text-m3-headline-small font-bold text-bbam-text-main mt-4 mb-6">Schedule Reminder</Text>

            {/* Frequency Selection */}
            <Text className="text-m3-label-large font-bold text-bbam-text-light mb-3 ml-1">Frequency</Text>
            <View className="flex-row gap-2 mb-6">
              <FrequencyButton label="Daily" value="Daily" />
              <FrequencyButton label="Weekly" value="Weekly" />
              <FrequencyButton label="Once" value="Once" />
            </View>

            {frequency === 'Weekly' && (
              <View className="mb-6">
                <Text className="text-m3-label-large font-bold text-bbam-text-light mb-3 ml-1">Select Day</Text>
                <View className="flex-row justify-between">
                  {DAYS.map((day, index) => {
                    const isSelected = reminderTime.getDay() === index;
                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => {
                          const newDate = new Date(reminderTime);
                          // Adjust date to the next occurrence of this day
                          const currentDay = reminderTime.getDay();
                          const diff = index - currentDay;
                          newDate.setDate(reminderTime.getDate() + diff);
                          setReminderTime(newDate);
                        }}
                        className={`w-10 h-10 rounded-full items-center justify-center ${isSelected ? 'bg-bbam-indigo-main' : 'bg-bbam-back-card'}`}
                      >
                        <Text className={`text-[12px] font-bold ${isSelected ? 'text-white' : 'text-bbam-text-main'}`}>{day[0]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Date Row */}
            {frequency === 'Once'&& (
              <PressableAnimated 
                onPress={() => { setPickerMode('date'); setIsPickerVisible(true); }}
                fade
                baseColor='#E5ECF3'
                activeColor='#E2E8F0'
                className="flex-row justify-between items-center bg-bbam-back-card p-5 rounded-3xl mb-4"
              >
                <View>
                  <Text className="text-m3-body-small text-bbam-text-light mb-1">Date</Text>
                  <Text className="text-m3-body-large font-bold">{reminderTime.toLocaleDateString()}</Text>
                </View>
                <Ionicons name="calendar" size={24} color="#585AD1" />
              </PressableAnimated>  
            )}

            {/* Time Row */}
            <PressableAnimated 
              onPress={() => { setPickerMode('time'); setIsPickerVisible(true); }}
              fade
              baseColor='#E5ECF3'
              activeColor='#E2E8F0'
              className="flex-row justify-between items-center bg-bbam-back-card p-5 rounded-3xl mb-8"
            >
              <View>
                <Text className="text-m3-body-small text-bbam-text-light mb-1">Time</Text>
                <Text className="text-m3-body-large font-bold">
                  {reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Ionicons name="time" size={24} color="#585AD1" />
            </PressableAnimated>

            <Button title="Confirm Schedule" onPress={handleConfirm} />
          </Animated.View>
        </View>
      </Modal>

      {isPickerVisible && (
        <DateTimePicker
          testID="reminder-datetime-picker"
          value={reminderTime}
          mode={pickerMode}
          display={pickerMode === 'date' ? 'calendar' : 'spinner'}
          onChange={(e, date) => {
            setIsPickerVisible(false);
            if (date) setReminderTime(date);
          }}
        />
      )}
    </View>
  );
};

export default ReminderSection;
