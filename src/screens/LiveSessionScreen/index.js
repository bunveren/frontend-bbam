import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { RNMediapipe } from '@thinksys/react-native-mediapipe';
import { Ionicons } from '@expo/vector-icons';
import { evaluateForm } from '../../utils/ruleEngine';
import { mapMediaPipeToInternal } from '../../utils/poseMath';
import { feedbackProvider } from '../../utils/feedback';

const PoseDetectionScreen = ({ navigation, route }) => {
  const { exerciseType } = route.params || { exerciseType: 'Squat' }; 
  const [feedback, setFeedback] = useState("Align your body...");

  const handleLandmarks = (data) => {
    if (data && data.landmarks) {
      const internalLandmarks = mapMediaPipeToInternal(data.landmarks); 
      const evaluation = evaluateForm(internalLandmarks, exerciseType);
      const message = feedbackProvider.processFeedback(evaluation);
      
      setFeedback(message);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <RNMediapipe
        style={{ flex: 1 }}
        onLandmark={handleLandmarks}
        face={false}
        leftArm={true}
        rightArm={true}
        leftWrist={true}
        rightWrist={true}
        torso={true}
        leftLeg={true}
        rightLeg={true}
        leftAnkle={true}
        rightAnkle={true}
      />

      <View className="absolute top-12 left-6">
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="bg-white/20 p-3 rounded-full"
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
      </View>
      
      <View className="absolute bottom-20 self-center bg-bbam-indigo-main/80 px-6 py-4 rounded-3xl">
        <Text className="text-white font-bold text-center text-m3-body-large">
          {feedback}
        </Text>
      </View>
      
    </View>
  );
};

export default PoseDetectionScreen;
