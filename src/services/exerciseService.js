import api from '../api';

export const fetchExerciseLibraryFromApi = async () => {
  const response = await api.get('/workout/exercises/');
  
  return response.data.map((ex) => ({
    ...ex,
    name: ex.name.replaceAll('-', ' '),
    ...ex.rules_json
  }));
};