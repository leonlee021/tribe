// NotificationHandler.js
import React, { useEffect, useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NotificationContext } from '../contexts/NotificationContext';
import { registerDeviceForNotifications } from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

const NotificationHandler = () => {
  const navigation = useNavigation();
  const { handleNewNotification } = useContext(NotificationContext);

  useEffect(() => {
    let foregroundSubscription;
    
    const initializeNotifications = async () => {
      try {
        // Request permissions first
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        console.log('Notification authorization status:', authStatus);
        
        if (!enabled) {
          console.log('Notifications not enabled');
          return;
        }

        // Get FCM token
        const token = await messaging().getToken();
        console.log('Current FCM token:', token);

        // Set up foreground handler
        foregroundSubscription = messaging().onMessage(remoteMessage => {
          console.log('🔵 Foreground message received:', remoteMessage);
          handleNewNotification(remoteMessage);
        });

        // Set up background handler
        messaging().setBackgroundMessageHandler(async remoteMessage => {
          console.log('🔵 Background message received:', remoteMessage);
          handleNewNotification(remoteMessage);
          return Promise.resolve();
        });

        // Handle notification open events
        messaging().onNotificationOpenedApp(remoteMessage => {
          console.log('🔵 Notification opened app:', remoteMessage);
          handleNewNotification(remoteMessage);
        });

        // Check for initial notification
        const initialNotification = await messaging().getInitialNotification();
        if (initialNotification) {
          console.log('🔵 Initial notification:', initialNotification);
          handleNewNotification(initialNotification);
        }

        // Add token refresh handler
        messaging().onTokenRefresh(token => {
          console.log('🔵 FCM token refreshed:', token);
        });

        // Add error handler
        messaging().onError(error => {
          console.error('🔴 FCM error:', error);
        });

      } catch (error) {
        console.error('🔴 Error setting up notifications:', error);
      }
    };

    console.log('🟡 Setting up notification handlers...');
    initializeNotifications();

    // Cleanup
    return () => {
      console.log('🟡 Cleaning up notification handlers...');
      if (foregroundSubscription) {
        foregroundSubscription();
      }
    };
  }, [handleNewNotification]);

  // Add periodic permission check
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const authStatus = await messaging().hasPermission();
        console.log('🟡 Current notification permission status:', authStatus);
      } catch (error) {
        console.error('🔴 Error checking notification permissions:', error);
      }
    };

    checkPermissions();
    const interval = setInterval(checkPermissions, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return null;
};

export default NotificationHandler;