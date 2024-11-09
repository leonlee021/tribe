// authService.js
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { auth0Config } from '../../auth0Config.js';
import { create } from 'zustand';

const useAuthStore = create((set) => ({
  isAuthenticated: false,
  setAuthenticated: (state) => set({ isAuthenticated: state }),
}));

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeToRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const onRefreshComplete = (token) => {
  refreshSubscribers.map((callback) => callback(token));
  refreshSubscribers = [];
};

const redirectUri = AuthSession.makeRedirectUri({ 
  scheme: 'mutually',
  useProxy: true 
});

const auth0Domain = auth0Config.domain;
const auth0ClientId = auth0Config.clientId;

export const setupAuthInterceptor = (api) => {
  api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle both 401 and 403 errors
      if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
        originalRequest._retry = true;

        // Check for refresh token
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          await handleAuthError();
          return Promise.resolve({ data: null });
        }

        if (!isRefreshing) {
          isRefreshing = true;

          try {
            const newToken = await refreshAuthToken();
            
            if (newToken) {
              api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              onRefreshComplete(newToken);
              isRefreshing = false;
              return api(originalRequest);
            } else {
              await handleAuthError();
              return Promise.resolve({ data: null });
            }
          } catch (refreshError) {
            isRefreshing = false;
            await handleAuthError();
            return Promise.resolve({ data: null });
          }
        } else {
          return new Promise((resolve) => {
            subscribeToRefresh((token) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(api(originalRequest));
            });
          });
        }
      }

      return Promise.reject(error);
    }
  );
};

export const refreshAuthToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) {
      return null;
    }

    const response = await axios.post(`${auth0Domain}/oauth/token`, {
      grant_type: 'refresh_token',
      client_id: auth0ClientId,
      refresh_token: refreshToken,
    });

    if (response.data?.access_token) {
      // Store as userToken instead of accessToken
      await AsyncStorage.setItem('userToken', response.data.access_token);
      if (response.data.refresh_token) {
        await AsyncStorage.setItem('refreshToken', response.data.refresh_token);
      }
      return response.data.access_token;
    }
    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
};

const handleAuthError = async () => {
  await AsyncStorage.multiRemove(['userToken', 'refreshToken']);
  useAuthStore.getState().setAuthenticated(false);
};

export const loginWithAuth0 = async () => {
  try {
    const authUrl = `${auth0Domain}/authorize?client_id=${auth0ClientId}&redirect_uri=${redirectUri}&response_type=token&scope=openid profile email offline_access`;
    const result = await AuthSession.startAsync({ authUrl });

    if (result.type === 'success' && result.params.access_token) {
      // Store as userToken instead of accessToken
      await AsyncStorage.setItem('userToken', result.params.access_token);
      if (result.params.refresh_token) {
        await AsyncStorage.setItem('refreshToken', result.params.refresh_token);
      }
      useAuthStore.getState().setAuthenticated(true);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
};

export const logoutWithAuth0 = async () => {
  try {
    await AsyncStorage.multiRemove(['userToken', 'refreshToken']);
    useAuthStore.getState().setAuthenticated(false);
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

export const initializeAuth = async () => {
  const token = await AsyncStorage.getItem('userToken');
  useAuthStore.getState().setAuthenticated(!!token);
};

export { useAuthStore };