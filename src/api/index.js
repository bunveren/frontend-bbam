import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as Application from 'expo-application';

const api = axios.create({
  // device ip on the current wireless network - add to .env file in the root folder
  // as http://{ip_addr}:8000/api and start django backend with python manage.py runserver 0.0.0.0:8000
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const uuid = Platform.OS === 'ios' ? await Application.getIosIdForVendorAsync() : Application.getAndroidId();
  config.headers['X-Device-UUID'] = uuid;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // clear stored credentials to force logout
      // implement refresh token later ?
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userId');
    }
    return Promise.reject(error);
  }
);

export default api;
