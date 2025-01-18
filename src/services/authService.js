import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createApiClient from './authClient';

class AuthService {
  constructor() {
    this.api = createApiClient();
    this.setupAuthInterceptors();
  }

  setupAuthInterceptors() {
    this.api.interceptors.request.use(async (config) => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      } catch (error) {
        console.error('Error in request interceptor:', error);
        return config;
      }
    });

    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Check if error is due to invalid token
        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const currentUser = auth().currentUser;
            if (!currentUser) {
              // No current user, clear tokens and throw error
              await this.clearAuthState();
              throw new Error('No authenticated user');
            }

            // Force token refresh
            const newToken = await currentUser.getIdToken(true);
            if (!newToken) {
              await this.clearAuthState();
              throw new Error('Failed to get new token');
            }

            // Update stored token
            await AsyncStorage.setItem('userToken', newToken);
            this.api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

            return this.api(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            await this.clearAuthState();
            throw refreshError;
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async clearAuthState() {
    try {
      await AsyncStorage.removeItem('userToken');
      delete this.api.defaults.headers.common['Authorization'];
      // Sign out from Firebase
      await auth().signOut();
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
  }

  async fetchWithSilentAuth(apiCall) {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        await this.clearAuthState();
        return { data: null };
      }

      try {
        const token = await currentUser.getIdToken(false);
        await AsyncStorage.setItem('userToken', token);
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (tokenError) {
        console.error('Error getting token:', tokenError);
        await this.clearAuthState();
        return { data: null };
      }

      const response = await apiCall(this.api);
      return response;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        try {
          const currentUser = auth().currentUser;
          if (!currentUser) {
            await this.clearAuthState();
            return { data: null };
          }

          const newToken = await currentUser.getIdToken(true);
          await AsyncStorage.setItem('userToken', newToken);
          this.api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          
          const response = await apiCall(this.api);
          return response;
        } catch (refreshError) {
          console.error('Silent auth refresh failed:', refreshError);
          await this.clearAuthState();
        }
      }
      return { data: null };
    }
  }

  getApi() {
    return this.api;
  }
}

const authService = new AuthService();
export default authService;

