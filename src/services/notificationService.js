import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

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
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const registerDeviceForNotifications = async () => {
  try {
    const hasPermission = await requestUserPermission();
    if (!hasPermission) return;

    const fcmToken = await getFcmToken();
    if (!fcmToken) return;

    const userToken = await AsyncStorage.getItem('userToken');
    if (!userToken) throw new Error('No user token found');

    await api.post(
      '/notifications/update-fcm-token',
      { fcmToken },
      { headers: { Authorization: `Bearer ${userToken}` }}
    );

    return fcmToken;
  } catch (error) {
    console.error('Error registering device for notifications:', error);
  }
};