import { useQuery } from '@tanstack/react-query';
import { fetchExerciseLibraryFromApi } from "../services/exerciseService";

export const useExerciseLibrary = () => {
  return useQuery({
    queryKey: ['exerciseLibrary'],
    queryFn: fetchExerciseLibraryFromApi,
    staleTime: Infinity, 
  });
};