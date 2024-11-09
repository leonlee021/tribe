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
