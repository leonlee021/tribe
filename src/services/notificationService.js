// src/services/notificationService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const fetchNotifications = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return []; // Return an empty array if no token

    const headers = { Authorization: `Bearer ${token}` };
    const response = await api.get('/notifications/user-notifications', { headers });
    const allNotifications = response.data.notifications || [];

    return allNotifications; // Return the notifications array
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return []; // Return an empty array in case of error
  }
};

export const clearTaskNotifications = async (message, taskId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('User token not found');
  
      const headers = { Authorization: `Bearer ${token}` };

      // Log to verify taskId and message
      console.log('Clearing notifications for:', { message, taskId });

      await api.post('/notifications/clear-task-notifications', { message, taskId }, { headers });
    } catch (error) {
      console.error('Error clearing task notifications:', error);
    }
  };