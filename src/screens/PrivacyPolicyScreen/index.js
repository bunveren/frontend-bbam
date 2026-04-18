import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const LAST_UPDATED = "April 16, 2025";
const APP_NAME = "Body & Beyond AI Mentor";
const COMPANY_NAME = "Body & Beyond";
const CONTACT_EMAIL = "support@bodyandbeyond.app";

const Section = ({ title, children }) => (
  <View className="mb-6">
    <Text className="text-m3-title-medium font-bold text-bbam-text-main mb-2">
      {title}
    </Text>
    {children}
  </View>
);

const Body = ({ children }) => (
  <Text className="text-m3-body-medium text-bbam-text-main leading-6 mb-2">
    {children}
  </Text>
);

const Bullet = ({ children }) => (
  <View className="flex-row mb-1.5 pl-2">
    <Text className="text-bbam-text-main mr-2 mt-0.5">•</Text>
    <Text className="text-m3-body-medium text-bbam-text-main leading-6 flex-1">
      {children}
    </Text>
  </View>
);

const PrivacyPolicyScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-bbam-back-page"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 border-b-[0.5px] border-[#D4D6DD]">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2"
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={28} color="#585AD1" />
        </TouchableOpacity>
        <Text className="text-m3-headline-small font-bold text-bbam-text-main ml-2">
          Privacy Policy
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 48 }}
      >
        <Text className="text-m3-body-small text-bbam-text-light mb-6">
          Last updated: {LAST_UPDATED}
        </Text>

        <Body>
          Welcome to {APP_NAME}. We are committed to protecting your personal
          information and your right to privacy. This Privacy Policy explains
          what data we collect, how we use it, and what rights you have in
          relation to it.
        </Body>
        <Body>
          By using our app, you agree to the collection and use of information
          in accordance with this policy.
        </Body>

        {/* 1 */}
        <Section title="1. Information We Collect">
          <Body>
            We collect the following types of information when you use{" "}
            {APP_NAME}:
          </Body>
          <Text className="text-m3-label-large font-bold text-bbam-text-main mt-2 mb-1.5">
            Account & Profile Data
          </Text>
          <Bullet>Email address and password (used for authentication)</Bullet>
          <Bullet>Username, age, gender, height, and weight (used to personalise your experience)</Bullet>

          <Text className="text-m3-label-large font-bold text-bbam-text-main mt-3 mb-1.5">
            Workout & Activity Data
          </Text>
          <Bullet>Workout plans you create (exercise names, sets, reps, duration)</Bullet>
          <Bullet>Workout session logs (start/end times, exercises completed, accuracy scores)</Bullet>
          <Bullet>AI-generated performance feedback and form analysis from your live sessions</Bullet>

          <Text className="text-m3-label-large font-bold text-bbam-text-main mt-3 mb-1.5">
            Camera Data
          </Text>
          <Bullet>
            We access your device camera during live workout sessions solely to
            analyse your exercise form in real time using AI pose detection.
            Camera frames are processed on-device and are not stored, recorded,
            or transmitted to our servers.
          </Bullet>

          <Text className="text-m3-label-large font-bold text-bbam-text-main mt-3 mb-1.5">
            Device & Technical Data
          </Text>
          <Bullet>Device identifier (UUID) and Expo push token for sending workout reminders</Bullet>
          <Bullet>Operating system type (iOS / Android)</Bullet>
        </Section>

        {/* 2 */}
        <Section title="2. How We Use Your Information">
          <Body>We use the data we collect to:</Body>
          <Bullet>Create and manage your account</Bullet>
          <Bullet>Provide personalised workout plans and AI coaching</Bullet>
          <Bullet>Track your fitness progress over time</Bullet>
          <Bullet>Send workout reminder notifications at your chosen times</Bullet>
          <Bullet>Sync your reminder schedule across devices</Bullet>
          <Bullet>Improve the accuracy of our AI form-detection models (using aggregated, anonymised data only)</Bullet>
          <Bullet>Respond to support requests or feedback you submit</Bullet>
        </Section>

        {/* 3 */}
        <Section title="3. Camera & Pose Detection">
          <Body>
            {APP_NAME} uses your device camera exclusively during live workout
            sessions to detect your body pose and provide real-time form
            feedback. Specifically:
          </Body>
          <Bullet>Camera access is requested only when you start a live session</Bullet>
          <Bullet>Video frames are analysed locally on your device using an on-device AI model</Bullet>
          <Bullet>No video footage or images are uploaded, stored, or shared</Bullet>
          <Bullet>You can revoke camera permission at any time in your device settings; doing so will disable the live AI coaching feature</Bullet>
        </Section>

        {/* 4 */}
        <Section title="4. Notifications">
          <Body>
            With your permission, we send local and push notifications to
            remind you of your scheduled workouts. You can:
          </Body>
          <Bullet>Enable or disable reminders for each individual workout plan</Bullet>
          <Bullet>Manage notification permissions in your device settings at any time</Bullet>
          <Body>
            We do not use notifications for marketing or advertising purposes.
          </Body>
        </Section>

        {/* 5 */}
        <Section title="5. Data Storage & Security">
          <Body>
            Your data is stored on secure servers. We implement
            industry-standard security measures including:
          </Body>
          <Bullet>HTTPS encryption for all data in transit</Bullet>
          <Bullet>JWT-based authentication with secure token storage on your device</Bullet>
          <Bullet>Access controls limiting who can view your personal data</Bullet>
          <Body>
            While we strive to protect your information, no method of
            electronic transmission or storage is 100% secure. We cannot
            guarantee absolute security.
          </Body>
        </Section>

        {/* 6 */}
        <Section title="6. Data Sharing">
          <Body>
            We do not sell, trade, or rent your personal information to third
            parties. We may share data only in the following limited
            circumstances:
          </Body>
          <Bullet>
            <Text className="font-bold">Service providers:</Text> Third-party
            services that help us operate the app (e.g., push notification
            infrastructure via Expo), bound by confidentiality agreements
          </Bullet>
          <Bullet>
            <Text className="font-bold">Legal requirements:</Text> If required
            by law or in response to valid legal processes
          </Bullet>
          <Bullet>
            <Text className="font-bold">Business transfers:</Text> In the event
            of a merger or acquisition, your data may be transferred as part of
            that transaction
          </Bullet>
        </Section>

        {/* 7 */}
        <Section title="7. Data Retention">
          <Body>
            We retain your personal data for as long as your account is active.
            You may request deletion of your account and associated data at any
            time by contacting us at{" "}
            <Text className="text-bbam-indigo-main">{CONTACT_EMAIL}</Text>.
            Upon deletion, your data will be permanently removed from our
            servers within 30 days, except where retention is required by law.
          </Body>
        </Section>

        {/* 8 */}
        <Section title="8. Your Rights">
          <Body>You have the right to:</Body>
          <Bullet>Access the personal data we hold about you</Bullet>
          <Bullet>Correct inaccurate or incomplete data</Bullet>
          <Bullet>Request deletion of your account and data</Bullet>
          <Bullet>Withdraw consent for notifications at any time</Bullet>
          <Bullet>Revoke camera access via your device settings</Bullet>
          <Body>
            To exercise any of these rights, please contact us at{" "}
            <Text className="text-bbam-indigo-main">{CONTACT_EMAIL}</Text>.
          </Body>
        </Section>

        {/* 9 */}
        <Section title="9. Children's Privacy">
          <Body>
            {APP_NAME} is not intended for children under the age of 10. We do
            not knowingly collect personal information from children under 10.
            If you believe we have inadvertently collected such data, please
            contact us immediately so we can delete it.
          </Body>
        </Section>

        {/* 10 */}
        <Section title="10. Changes to This Policy">
          <Body>
            We may update this Privacy Policy from time to time. We will notify
            you of any significant changes by updating the "Last updated" date
            at the top of this policy. We encourage you to review this page
            periodically.
          </Body>
        </Section>

        {/* 11 */}
        <Section title="11. Contact Us">
          <Body>
            If you have any questions or concerns about this Privacy Policy or
            how we handle your data, please contact us:
          </Body>
          <Body>
            <Text className="font-bold">{COMPANY_NAME}</Text>
            {"\n"}Email:{" "}
            <Text className="text-bbam-indigo-main">{CONTACT_EMAIL}</Text>
          </Body>
        </Section>
      </ScrollView>
    </View>
  );
};

export default PrivacyPolicyScreen;
