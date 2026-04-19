// hooks/useSessions.js
import { useQuery } from '@tanstack/react-query';
import { getSessionHistory } from '../services/trackingService';

export const useSessions = () => {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: getSessionHistory,
  });
};