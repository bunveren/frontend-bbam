import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { mapWorkoutsToInternalStructure } from '../utils/general';

export const useWorkoutPlans = () => {
  return useQuery({
    queryKey: ['workoutPlans'],
    queryFn: async () => {
      try {
        const response = await api.get('/workout/plans/');
        return mapWorkoutsToInternalStructure(response.data);
      } catch (error) {
        console.error("API Error in useWorkoutPlans:", error.response?.data || error.message);
        throw new Error("Failed to load workout plans");
      }
    },
    staleTime: Infinity
  });
};
