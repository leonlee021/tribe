// notificationService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import authService from './authService'; 

// Add token management with debouncing
let tokenUpdatePromise = null;
let lastTokenUpdate = 0;
const TOKEN_UPDATE_COOLDOWN = 5000; // 5 seconds cooldown

export const fetchNotifications = async () => {
  const response = await authService.fetchWithSilentAuth(api => 
    api.get('/notifications/user-notifications')
  );
  
  // If response is null (auth error) or no notifications, return empty array
  return (response?.data?.notifications || []);  // Added .data to handle the response structure
};

export const clearTaskNotifications = async (message, taskId) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('User token not found');

    const headers = { Authorization: `Bearer ${token}` };
    await api.post('/notifications/clear-task-notifications', 
      { message, taskId }, 
      { headers }
    );
  } catch (error) {
    console.error('Error clearing task notifications:', error);
  }
};

export const requestUserPermission = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      return true;
    }
    console.log('User declined push notifications');
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const getFcmToken = async () => {
  try {
    // Check if we already have a token stored
    const storedToken = await AsyncStorage.getItem('fcmToken');
    const currentToken = await messaging().getToken();
    
    // Only update if token has changed
    if (storedToken !== currentToken) {
      console.log('New FCM Token retrieved:', currentToken);
      await AsyncStorage.setItem('fcmToken', currentToken);
      await AsyncStorage.setItem('devicePlatform', Platform.OS);
      return currentToken;
    }
    
    return storedToken;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const updateFcmToken = async (fcmToken) => {
  try {
    // Check cooldown
    const now = Date.now();
    if (now - lastTokenUpdate < TOKEN_UPDATE_COOLDOWN) {
      console.log('Token update skipped (cooldown)');
      return true;
    }

    // If there's already an update in progress, wait for it
    if (tokenUpdatePromise) {
      return tokenUpdatePromise;
    }

    const userToken = await AsyncStorage.getItem('userToken');
    if (!userToken) {
      console.log('No user token found - user might not be logged in');
      return false;
    }

    // Store this update attempt
    lastTokenUpdate = now;

    tokenUpdatePromise = (async () => {
      try {
        // Check if token has changed from what's stored
        const storedToken = await AsyncStorage.getItem('fcmToken');
        if (storedToken === fcmToken) {
          console.log('Token unchanged, skipping update');
          return true;
        }

        console.log('Updating FCM token in backend...');
        const headers = { 
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        };

        const response = await api.post(
          '/notifications/update-fcm-token',
          { 
            fcmToken,
            platform: Platform.OS
          },
          { headers }
        );
        
        if (response.data.success) {
          await AsyncStorage.setItem('fcmToken', fcmToken);
          console.log('FCM token successfully updated');
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error updating FCM token:', error);
        return false;
      }
    })();

    return tokenUpdatePromise;
  } catch (error) {
    console.error('Error in updateFcmToken:', error);
    return false;
  } finally {
    tokenUpdatePromise = null;
  }
};

export const registerDeviceForNotifications = async () => {
  try {
    const permission = await requestUserPermission();
    if (!permission) {
      console.log('Notification permission not granted');
      return false;
    }

    const fcmToken = await getFcmToken();
    if (!fcmToken) {
      console.log('Failed to get FCM token');
      return false;
    }

    // Set up token refresh handler
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
      console.log('FCM Token refreshed');
      await updateFcmToken(newToken);
    });

    // Update backend with current token
    const success = await updateFcmToken(fcmToken);
    if (!success) {
      console.log('Failed to update FCM token in backend');
      unsubscribeTokenRefresh();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error registering device for notifications:', error);
    return false;
  }
};

export const debugTokens = async () => {
  const fcmToken = await AsyncStorage.getItem('fcmToken');
  const userToken = await AsyncStorage.getItem('userToken');
  console.log('Stored Tokens:', {
    fcmToken,
    hasUserToken: !!userToken
  });
  return { fcmToken, hasUserToken: !!userToken };
};

export default {
  fetchNotifications,
  clearTaskNotifications,
  requestUserPermission,
  getFcmToken,
  updateFcmToken,
  registerDeviceForNotifications,
  debugTokens
};