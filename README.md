# Body & Beyond AI Mentor (BBAM)
Body & Beyond AI Mentor is a full-stack fitness application designed to provide real-time form correction and rep counting through computer vision. BBAM uses the device camera to analyze movement patterns and provides immediate audio-visual feedback during workouts.

### Core Features
* **Custom Workout Plans:** Allows users to create, view and modify their own workout plans.
* **Real-Time Pose Estimation:** Utilizes MediaPipe to track skeletal landmarks with high precision.
* **Rep & Hold Tracking:** Automatically counts repetitions and durations.
* **Real-time Feedback:** Evaluates joint angles in real-time to detect common errors and provides instant voice guidance.
* **AI Summary:** Generates post-workout summaries using workout session data to provide improvement tips.
* **Progress Tracking:** Logs previous workout sessions, maintaining records of accuracy scores, duration, and exercise-specific performance.

### Frontend Tech Stack
* **Language:** JavaScript
* **Framework:** React Native with Expo
* **State Management:** React Query
* **Pose Estimation:** MediaPipe for high-performance, low-latency skeletal tracking
* **Styling:** NativeWind

### Project Structure
* `src/api/`: Configuration for Axios client used to interface with the Django backend.
* `src/components/`: Reusable custom UI elements.
* `src/hooks/`: Specialized logic including useAuth for user state, useExerciseLibrary for data fetching, and usePoseProcessor for real-time skeletal calculations.
* `src/navigation/`: Navigation configuration containing the RootNavigator for auth logic and TabNavigator for the primary app layout.
* `src/screens/`: Primary view components.
* `src/services/`: Abstracted data services to handle raw API communication and data formatting.
* `src/utils/`: Shared utility functions including poseMath for geometry calculations, feedback for voice output, and notifications for system alerts.
* `assets/`: Static images.
