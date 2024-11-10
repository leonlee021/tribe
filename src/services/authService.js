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
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const currentUser = auth().currentUser;
            if (currentUser) {
              const newToken = await currentUser.getIdToken(true);
              await AsyncStorage.setItem('userToken', newToken);
              
              this.api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            console.log('Token refresh failed:', refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async fetchWithSilentAuth(apiCall) {
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken(false);
        await AsyncStorage.setItem('userToken', token);
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await apiCall(this.api);
      return response;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        try {
          const currentUser = auth().currentUser;
          if (currentUser) {
            const newToken = await currentUser.getIdToken(true);
            await AsyncStorage.setItem('userToken', newToken);
            this.api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            const response = await apiCall(this.api);
            return response;
          }
        } catch (refreshError) {
          console.log('Silent auth refresh failed:', refreshError);
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