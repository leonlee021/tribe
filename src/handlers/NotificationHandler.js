import React, { useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NotificationContext } from '../contexts/NotificationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

const updateBackendWithToken = async (fcmToken) => {
  try {
    const userToken = await AsyncStorage.getItem('userToken');
    const apiUrl = 'https://mutually-618cad73c12d.herokuapp.com'; // Using direct URL for now
    
    console.log('🔍 Making request with:', {
      fcmToken: fcmToken,
      platform: Platform.OS,
      hasUserToken: !!userToken
    });

    const response = await fetch(`${apiUrl}/notifications/update-fcm-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fcmToken,
        platform: Platform.OS
      })
    });

    // Log the raw response
    const rawResponse = await response.text();
    console.log('🔍 Raw response:', rawResponse);
    
    // Try to parse if it's JSON
    let data;
    try {
      data = JSON.parse(rawResponse);
      console.log('🔍 Parsed response:', data);
    } catch (e) {
      console.log('🔴 Could not parse response as JSON');
      return false;
    }

    return data.success;
  } catch (error) {
    console.error('🔴 Error updating backend with FCM token:', error);
    return false;
  }
};

export const getTestFCMToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log('🎯 Test FCM Token:', token);
    // Also update backend when getting test token
    await updateBackendWithToken(token);
    return token;
  } catch (error) {
    console.error('🔴 Error getting test FCM token:', error);
    return null;
  }
};

const NotificationHandler = () => {
  const navigation = useNavigation();
  const { handleNewNotification } = useContext(NotificationContext);

  useEffect(() => {
    getTestFCMToken();
  }, []);

  useEffect(() => {
    let foregroundSubscription;
    
    const initializeNotifications = async () => {
      try {
        // Request permissions first
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        console.log('🟡 Notification authorization status:', authStatus);
        
        if (!enabled) {
          console.log('🔴 Notifications not enabled');
          return;
        }

        // Configure how notifications appear when app is in foreground
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        // Get FCM token and update backend
        const token = await messaging().getToken();
        console.log('🟢 Generated FCM token:', token);
        
        await AsyncStorage.setItem('fcmToken', token);
        console.log('🟢 Stored FCM token in AsyncStorage');
        
        const updateSuccess = await updateBackendWithToken(token);
        console.log('🟢 Backend token update success:', updateSuccess);

        // Rest of your existing notification setup code...
        foregroundSubscription = messaging().onMessage(async remoteMessage => {
          try {
            console.log('🔵 Foreground message received:', remoteMessage);
            await handleNewNotification(remoteMessage);
            
            await Notifications.scheduleNotificationAsync({
              content: {
                title: remoteMessage.notification?.title || '',
                body: remoteMessage.notification?.body || '',
                data: remoteMessage.data,
              },
              trigger: null,
            });
          } catch (error) {
            console.error('🔴 Error handling foreground message:', error);
          }
        });

        // Update backend on token refresh
        messaging().onTokenRefresh(async newToken => {
          try {
            console.log('🔵 FCM token refreshed:', newToken);
            await AsyncStorage.setItem('fcmToken', newToken);
            await updateBackendWithToken(newToken);
          } catch (error) {
            console.error('🔴 Error handling token refresh:', error);
          }
        });

        // Rest of your existing handlers...

      } catch (error) {
        console.error('🔴 Error setting up notifications:', error);
      }
    };

    console.log('🟡 Setting up notification handlers...');
    initializeNotifications().catch(error => {
      console.error('🔴 Unhandled error in notification setup:', error);
    });

    return () => {
      if (foregroundSubscription) {
        foregroundSubscription();
      }
    };
  }, [handleNewNotification, navigation]);

  const handleNotificationNavigation = (message) => {
    if (!message?.data) return;

    const { screen, params } = message.data;
    if (screen) {
      navigation.navigate(screen, params ? JSON.parse(params) : undefined);
    }
  };

  return null;
};

export default NotificationHandler;