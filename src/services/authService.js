// authService.js
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

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

      if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Get current Firebase user
          const currentUser = auth().currentUser;
          if (currentUser) {
            // Force token refresh
            const newToken = await currentUser.getIdToken(true);
            await AsyncStorage.setItem('userToken', newToken);
            
            // Update headers and retry request
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.log('Token refresh failed:', refreshError);
        }
      }
      return Promise.reject(error);
    }
  );
};

// For testing token expiry
// export const setTestTokenExpiry = async () => {
//   try {
//     // Force token refresh after 20 seconds
//     setTimeout(async () => {
//       const currentUser = auth().currentUser;
//       if (currentUser) {
//         try {
//           const newToken = await currentUser.getIdToken(true);
//           await AsyncStorage.setItem('userToken', newToken);
//           api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
//         } catch (error) {
//           console.log('Test token refresh failed:', error);
//         }
//       }
//     }, 10000);
//   } catch (error) {
//     console.error('Error in test token expiry:', error);
//   }
// };

export const fetchWithSilentAuth = async (apiCall) => {
  try {
    // Ensure we have a fresh token before making the call
    const currentUser = auth().currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken(false);
      await AsyncStorage.setItem('userToken', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await apiCall();
    return response;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Try one more time with a forced token refresh
      try {
        const currentUser = auth().currentUser;
        if (currentUser) {
          const newToken = await currentUser.getIdToken(true);
          await AsyncStorage.setItem('userToken', newToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          const response = await apiCall();
          return response;
        }
      } catch (refreshError) {
        console.log('Silent auth refresh failed:', refreshError);
      }
    }
    return { data: null };
  }
};