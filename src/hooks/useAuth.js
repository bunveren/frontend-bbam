import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { fetchExerciseLibraryFromApi } from '../services/exerciseService';
import api from '../api';

export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const userId = await SecureStore.getItemAsync('userId');
      if (!userId) return null;

      const { data } = await api.get(`/users/profiles/${userId}/`);
      console.log({ userData: data});
      return data;
    },
    retry: false,
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (credentials) => {
      // credentials = { email, password }
      const { data } = await api.post('/users/login/', credentials);
      return {
        ...data,
        email: credentials.email,
      };
    },
    onSuccess: async (data) => {
      console.log({ loginData: data });
      await SecureStore.setItemAsync('userToken', data.access);
      await SecureStore.setItemAsync('userId', String(data.user_id)); 
      await SecureStore.setItemAsync('userEmail', data.email);
      
      // invalidate to trigger useUser
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
      queryClient.prefetchQuery({
        queryKey: ['exerciseLibrary'],
        queryFn: fetchExerciseLibraryFromApi
      });
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: async (userData) => {
      const { data } = await api.post('/users/register/', userData);
      return data;
    }
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, ...updatedFields }) => {
      const userId = user_id || await SecureStore.getItemAsync('userId');
      const { data } = await api.patch(`/users/profiles/${userId}/`, updatedFields);
      return data;
    },
    onSuccess: (data) => {
      // refresh the user cache so Home and ProfileSettings show the new data instantly
      const previousData = queryClient.getQueryData(['user']);
      queryClient.setQueryData(['user'], {
        ...previousData,
        ...data
      });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};
