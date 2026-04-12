export const getInitials = (userProfile) => {
  const name = userProfile?.user_name || "";
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) return "U";
  const first = parts[0]?.[0] || "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
};

const calculateDuration = (list) => {
  if (list.length === 0) return 0;

  const secondsPerRep = 4;

  const totalSeconds = list.reduce((acc, exercise) => {
    const value = Number(exercise.value) || 0;
    if (exercise.mode === 'hold') {
      return acc + value;
    } else if (exercise.mode === 'reps') {
      return acc + (value * secondsPerRep);
    }
    return acc;
  }, 0);

  return Math.ceil(totalSeconds / 60);
};

export const mapWorkoutsToInternalStructure = (workoutList) => {
  
  return workoutList.map(({ id, plan_name, items}) => {
    const exercises = items.map(({ exercise: { id: exerciseId, name: exerciseName }, target_reps, target_seconds }) => ({
      id: exerciseId,
      name: exerciseName.replaceAll('-', ' '),
      mode: target_reps !== null ? 'reps' : 'hold',
      value: target_reps !== null ? target_reps : target_seconds
    }));

    const result = {
      id,
      name: plan_name,
      totalExercises: items.length,
      estimatedDuration: calculateDuration(exercises),
      exerciseList: exercises
    };

    return result;
  });
};