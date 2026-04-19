import api from '../api';

export const createSession = async (planId, planName, startTime) => {
  const formattedStartTime = startTime instanceof Date 
    ? startTime.toISOString() 
    : startTime;
  const formattedDate = startTime instanceof Date 
    ? startTime.toISOString().split('T')[0] 
    : startTime;

  const { data } = await api.post('/tracking/sessions/', {
    ...(planId && { plan: planId }),
    ...(planName && { plan_name: planName }),
    ...(formattedDate && { session_date: formattedDate }),
    ...(formattedStartTime && { started_at: formattedStartTime })
  });
  return data;
};

export const endSession = async (sessionId, payload) => {
  try {
    const { data } = await api.post(`/tracking/sessions/${sessionId}/end/`, payload);
    return data;
  } catch (error) {
    console.error("Error ending session:", error.message);
  }
  
};

export const deleteSession = async (sessionId) => {
  try {
    const { data } = await api.delete(`/tracking/sessions/${sessionId}/`);
    return data;
  } catch (error) {
    console.error("Error deleting session:", error);
  }
};

export const getSessionHistory = async () => {
  const { data } = await api.get('/tracking/sessions/');
  return data;
};

export const getSessionExercises = async (sessionId) => {
  const { data } = await api.get(`/tracking/sessions/${sessionId}/exercises/`);
  return data;
};