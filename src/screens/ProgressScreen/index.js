import React, { useEffect, useState, useCallback } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  SectionList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getSessionHistory, getSessionExercises } from "../../services/trackingService";
import PressableAnimated from "../../components/PressableAnimated";

import { useExerciseLibrary } from "../../hooks/useExerciseLibrary";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const accuracyColor = (v) =>
  v >= 80 ? "#585AD1" : v >= 60 ? "#F59E0B" : "#EF4444";

// ─── Session List Item ────────────────────────────────────────────────────────
const SessionListItem = ({ session, onPress }) => {
  const accuracy = session.overall_accuracy_score
    ? Math.round(session.overall_accuracy_score)
    : null;
  const color = accuracy != null ? accuracyColor(accuracy) : "#9DA3A9";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          borderWidth: 3,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F9FA",
        }}
      >
        {accuracy != null ? (
          <Text style={{ fontSize: 13, fontWeight: "700", color }}>
            {accuracy}%
          </Text>
        ) : (
          <Ionicons name="help-outline" size={18} color="#9DA3A9" />
        )}
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#263238" }}>
          {session.plan_name || "Unnamed Workout"}
        </Text>
        <Text style={{ fontSize: 12, color: "#9DA3A9" }}>
          {formatDate(session.session_date)}
          {session.duration_minutes ? ` · ${session.duration_minutes} min` : ""}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#C7C9EE" />
    </TouchableOpacity>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = () => (
  <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
    <MaterialCommunityIcons name="dumbbell" size={48} color="#C7C9EE" />
    <Text className="text-m3-body-large font-bold text-bbam-text-main text-center">
      You don't have any completed workout sessions yet.
    </Text>
    <Text className="text-m3-body-medium text-bbam-text-light text-center">
      Start a workout plan, complete it and{"\n"}your history will appear here.
    </Text>
  </View>
);

// ─── Accuracy Ring ────────────────────────────────────────────────────────────
const AccuracyRing = ({ value }) => {
  const color = accuracyColor(value);
  return (
    <View
      style={{
        width: 132,
        height: 132,
        borderRadius: 66,
        borderWidth: 12,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F7F9FA",
      }}
    >
      <Text style={{ fontSize: 34, fontWeight: "700", color: "#263238" }}>
        {value}%
      </Text>
      <Text style={{ fontSize: 11, color: "#9DA3A9", marginTop: 2 }}>
        Accuracy
      </Text>
    </View>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, value, label }) => (
  <View
    style={{
      flex: 1,
      backgroundColor: "#F7F9FA",
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
      gap: 4,
    }}
  >
    <Ionicons name={icon} size={20} color="#585AD1" />
    <Text style={{ fontSize: 17, fontWeight: "700", color: "#263238", marginTop: 2 }}>
      {value}
    </Text>
    <Text style={{ fontSize: 11, color: "#9DA3A9" }}>{label}</Text>
  </View>
);

// ─── Exercise Bar ─────────────────────────────────────────────────────────────
const ExerciseBar = ({ name, accuracy, reps, seconds, errors }) => {
  const color = accuracyColor(accuracy);
  const subtitle = reps
    ? `${reps} reps completed`
    : seconds
      ? `${seconds}s completed`
      : "";

  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#263238" }}>{name}</Text>
        <Text style={{ fontSize: 14, fontWeight: "700", color }}>{accuracy}%</Text>
      </View>
      <View style={{ height: 9, backgroundColor: "#E5ECF3", borderRadius: 5, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${accuracy}%`, backgroundColor: color, borderRadius: 5 }} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 12, color: "#9DA3A9" }}>{subtitle}</Text>
        {errors && errors.length > 0 && (
          <Text style={{ fontSize: 12, color: "#F59E0B", fontWeight: "500" }}>
            ⚠ {errors[0]}{errors.length > 1 ? ` +${errors.length - 1} more` : ""}
          </Text>
        )}
      </View>
    </View>
  );
};

// ─── Error Chip ───────────────────────────────────────────────────────────────
const ErrorChip = ({ label }) => {
  const readable = label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <View
      style={{
        backgroundColor: "#FEF3C7",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
      }}
    >
      <Ionicons name="warning-outline" size={13} color="#D97706" />
      <Text style={{ fontSize: 12, color: "#92400E", fontWeight: "600" }}>{readable}</Text>
    </View>
  );
};

// ─── Card wrapper ─────────────────────────────────────────────────────────────
const Card = ({ children, style }) => (
  <View
    style={[
      {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
      style,
    ]}
  >
    {children}
  </View>
);

const SectionTitle = ({ children }) => (
  <Text style={{ fontSize: 16, fontWeight: "700", color: "#263238", marginBottom: 4 }}>
    {children}
  </Text>
);

// ─── Session Detail View ──────────────────────────────────────────────────────
const SessionDetail = ({ session, onBack }) => {
  const insets = useSafeAreaInsets();
  const [sessionExercises, setSessionExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  const { data: exerciseLibrary = {} } = useExerciseLibrary();

  const accuracy = session.overall_accuracy_score
    ? Math.round(session.overall_accuracy_score)
    : 0;

  // Mock exercise breakdown — replace with GET /api/tracking/sessions/{id}/ exercises
  const mockExercises = [
    { name: "Squat", accuracy: 92, reps: 50, errors: [] },
    { name: "Plank", accuracy: 85, seconds: 60, errors: ["Heel lift"] },
    { name: "Push-Up", accuracy: 78, reps: 32, errors: ["Hips sagging", "Elbow flare"] },
  ];

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const data = await getSessionExercises(session.id);
        console.log({sessionexercises: data});
        setSessionExercises(data);
      } catch (err) {
        console.error("Failed to fetch exercises:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [session.id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F9FA" }}>
        <ActivityIndicator size="large" color="#585AD1" />
        <Text style={{ marginTop: 12, color: "#9DA3A9" }}>Loading exercise data...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F9FA", paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <PressableAnimated onPress={onBack} hitSlop={15} transform className="p-2 -ml-2">
          <Ionicons name="chevron-back" size={30} color="#585AD1" />
        </PressableAnimated>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#263238" }}>
          Session Summary
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
      >
        {/* Plan name + date */}
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#585AD1" }}>
            {session.plan_name || "Unnamed Workout"}
          </Text>
          <Text style={{ fontSize: 12, color: "#9DA3A9" }}>
            {formatDate(session.session_date)}
          </Text>
        </View>

        {/* Accuracy Hero */}
        <Card style={{ alignItems: "center", gap: 20 }}>
          <AccuracyRing value={accuracy} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#263238" }}>
            Overall Performance
          </Text>
          <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
            <StatCard
              icon="time-outline"
              value={session.duration_minutes ? `${session.duration_minutes}m` : "--"}
              label="Duration"
            />
            <StatCard
              icon="repeat-outline"
              value={sessionExercises?.reduce((s, e) => s + (e.completed_reps || 0), 0)}
              label="Total Reps"
            />
            <StatCard
              icon="barbell-outline"
              value={sessionExercises?.length}
              label="Exercises"
            />
          </View>
        </Card>

        {/* Exercise Breakdown */}
        <Card style={{ gap: 18 }}>
          <SectionTitle>Exercise Breakdown</SectionTitle>
          {sessionExercises?.map((ex, i) => (
            <React.Fragment key={i}>
              <ExerciseBar
                name={exerciseLibrary[ex.exercise]?.name || `Exercise ${ex.step_order}`}
                accuracy={ex.accuracy_score}
                reps={ex.completed_reps}
                seconds={ex.completed_seconds}
              />
              {i < sessionExercises?.length - 1 && (
                <View style={{ height: 1, backgroundColor: "#F0F4F8" }} />
              )}
            </React.Fragment>
          ))}
        </Card>

        {/* AI Coach Feedback */}
        <View
          style={{
            backgroundColor: "#585AD1",
            borderRadius: 24,
            padding: 20,
            gap: 14,
            shadowColor: "#585AD1",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
            elevation: 6,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, padding: 8 }}>
              <MaterialCommunityIcons name="brain" size={20} color="#fff" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
              AI Coach Feedback
            </Text>
          </View>

          {session?.summary_json?.ai_summary ? (
            <View style={{ maxHeight: 200 }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text 
                  style={{ 
                    fontSize: 15, 
                    color: "#fff", 
                    lineHeight: 23, 
                    opacity: 0.95,
                    textAlign: "left" 
                  }}
                >
                  {session?.summary_json?.ai_summary}
                </Text>
              </ScrollView>
            </View>
          ) : (
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 20 }}>
              Could not load feedback for this session.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const SectionHeader = ({ title, sessionCount, isExpanded, onToggle }) => (
  <TouchableOpacity 
    onPress={onToggle}
    activeOpacity={0.7}
    style={{ 
      backgroundColor: "#F7F9FA",
      paddingVertical: 12, 
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between' // Push icon to the right
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 4, height: 24, backgroundColor: '#585AD1', borderRadius: 2 }} />
      <Text style={{ fontSize: 16, fontWeight: "700", color: "#263238" }}>{title}</Text>
      <Text style={{ fontSize: 16, color: "#9DA3A9", fontWeight: '500' }}>({sessionCount})</Text>
    </View>
    
    <Ionicons 
      name={isExpanded ? "chevron-up" : "chevron-down"} 
      size={20} 
      color="#9DA3A9" 
    />
  </TouchableOpacity>
);

const groupSessionsByPlan = (sessions) => {
  const groups = sessions.reduce((acc, session) => {
    const planId = session.plan;
    const planName = session.plan_name || "Unnamed Workout";

    if (!acc[planId]) {
      acc[planId] = {
        planId,
        title: planName,
        data: [],
      };
    }
    acc[planId].data.push(session);
    return acc;
  }, {});

  return Object.values(groups);
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ProgressScreen = ({ route }) => {
  const insets = useSafeAreaInsets();

  const [sessions, setSessions] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  const sectionedData = React.useMemo(() => {
    const groups = groupSessionsByPlan(sessions);
    console.log({groups});
    
    return groups.map(section => ({
      ...section,
      // If true, show data. If undefined/false, show empty array.
      data: expandedSections[section.planId] ? section.data : []
    }));
  }, [sessions, expandedSections]);

  const toggleSection = (planId) => {
    console.log({expandedSections});
    setExpandedSections(prev => ({
      ...prev,
      [planId]: !prev[planId] // Toggle the boolean
    }));
  };

  const fetchSessions = useCallback(async () => {
    try {
      setListLoading(true);
      const data = await getSessionHistory();
      const sorted = [...data].sort(
        (a, b) => new Date(b.ended_at) - new Date(a.ended_at)
      );
      setSessions(sorted);
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // When LiveSession navigates here with a fresh session, auto-open its detail
  useEffect(() => {
    const incomingSessionId = route?.params?.sessionId;
    if (incomingSessionId && sessions.length > 0) {
      const match = sessions.find((s) => s.id === incomingSessionId);
      if (match) setSelectedSession(match);
    }
  }, [route?.params?.sessionId, sessions]);

  if (selectedSession) {
    return (
      <SessionDetail
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <View className="flex-1 bg-bbam-back-page" style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 }}>
        <Text className="text-m3-headline-medium font-bold text-bbam-text-main">
          Progress
        </Text>
        <Text className="text-m3-body-medium text-bbam-text-light mt-2">
          Previous Sessions
        </Text>
      </View>

      {listLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#585AD1" size="large" />
        </View>
      ) : listError ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 14, color: "#EF4444", textAlign: "center" }}>
            {listError}
          </Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <EmptyState />
        </View>
      ) : (
        <SectionList
          sections={sectionedData}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 10 }}>
              <SessionListItem
                session={item}
                onPress={() => setSelectedSession(item)}
              />
            </View>
          )}
          renderSectionHeader={({ section }) => (
            <SectionHeader 
              title={section.title} 
              sessionCount={sessions.filter(s => s.plan === section.planId).length} 
              isExpanded={!!expandedSections[section.planId]}
              onToggle={() => toggleSection(section.planId)}
            />
          )}
        />
      )}
    </View>
  );
};

export default ProgressScreen;
