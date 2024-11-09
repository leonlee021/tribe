import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';
import { setupAuthInterceptor } from './authService';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});

setupAuthInterceptor(api);

export default api;

// const api = axios.create({
//     baseURL: API_BASE_URL,
//     timeout: 30000,
// });

// // Add a request interceptor to attach the access token
// api.interceptors.request.use(async (config) => {
//     const token = await AsyncStorage.getItem('accessToken');
//     if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
// }, (error) => {
//     return Promise.reject(error);
// });

// // Add a response interceptor to refresh tokens when access token expires
// api.interceptors.response.use(
//     (response) => {
//         // Return response if it's successful
//         return response;
//     },
//     async (error) => {
//         const originalRequest = error.config;
        
//         // Check if the error is related to an expired access token
//         if (error.response?.status === 403 && error.response?.data?.error === 'Token expired, refresh token missing') {
//             try {
//                 // Fetch refresh token from storage
//                 const refreshToken = await AsyncStorage.getItem('refreshToken');
//                 if (refreshToken) {
//                     // Request new access token using refresh token
//                     const response = await axios.post(`${apiUrl}/auth/refresh-token`, { refreshToken });

//                     const { accessToken, newRefreshToken } = response.data;

//                     // Store new tokens
//                     await AsyncStorage.setItem('accessToken', accessToken);
//                     await AsyncStorage.setItem('refreshToken', newRefreshToken);

//                     // Update original request with new access token
//                     originalRequest.headers.Authorization = `Bearer ${accessToken}`;

//                     // Retry original request with new access token
//                     return api(originalRequest);
//                 } else {
//                     // If no refresh token, log the user out or show error
//                     return Promise.reject(error);
//                 }
//             } catch (refreshError) {
//                 // If refreshing the token fails, reject the promise
//                 return Promise.reject(refreshError);
//             }
//         }

//         // If error is not related to token expiration, reject the promise
//         return Promise.reject(error);
//     }
// );

// export default api;