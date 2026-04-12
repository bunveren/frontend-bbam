import api from '../api';

export const fetchExerciseLibraryFromApi = async () => {
  const response = await api.get('/workout/exercises/');

  return response.data.reduce((acc, exercise) => {
    const { rules_json, ...rest } = exercise;
    const mapped = {
      ...rest,
      name: exercise.name.replaceAll('-', ' '),
      ...rules_json
    };
    return {
      ...acc,
      [Integer(exercise.id)]: mapped
    };
  }, {});
};