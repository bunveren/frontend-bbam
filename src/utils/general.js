export const getInitials = (userProfile) => {
  const name = userProfile?.user_name || "";
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) return "U";
  const first = parts[0]?.[0] || "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
};

export const mapWorkoutsToInternalStructure = (workoutList) => {
  return workoutList.map(({ id, plan_name, items}) => ({
    id,
    name: plan_name,
    totalExercises: items.length,
    estimatedDuration: 0, // todo a util to calculate this?
    exerciseList: items.map(({ exercise: { id: exerciseId, name: exerciseName }, target_reps, target_seconds }) => ({
      id: exerciseId,
      name: exerciseName.replaceAll('-', ' '),
      mode: target_reps !== null ? 'reps' : 'hold',
      value: target_reps !== null ? target_reps : target_seconds
    }))
  }));
};