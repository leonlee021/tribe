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
        foregroundSubscription = messaging().onMessage(async remoteMessage => {
          try {
            console.log('🔵 Foreground message received:', remoteMessage);
            await handleNewNotification(remoteMessage);
          } catch (error) {
            console.error('Error handling foreground message:', error);
          }
        });

        // Set up background handler
        messaging().setBackgroundMessageHandler(async remoteMessage => {
          try {
            console.log('🔵 Background message received:', remoteMessage);
            await handleNewNotification(remoteMessage);
          } catch (error) {
            console.error('Error handling background message:', error);
          }
          return Promise.resolve();
        });

        // Handle notification open events
        messaging().onNotificationOpenedApp(async remoteMessage => {
          try {
            console.log('🔵 Notification opened app:', remoteMessage);
            await handleNewNotification(remoteMessage);
          } catch (error) {
            console.error('Error handling notification open:', error);
          }
        });

        // Check for initial notification
        const initialNotification = await messaging().getInitialNotification();
        if (initialNotification) {
          try {
            console.log('🔵 Initial notification:', initialNotification);
            await handleNewNotification(initialNotification);
          } catch (error) {
            console.error('Error handling initial notification:', error);
          }
        }

        // Add token refresh handler
        messaging().onTokenRefresh(async newToken => {
          try {
            console.log('🔵 FCM token refreshed:', newToken);
            await AsyncStorage.setItem('fcmToken', newToken);
          } catch (error) {
            console.error('Error handling token refresh:', error);
          }
        });

      } catch (error) {
        console.error('🔴 Error setting up notifications:', error);
      }
    };

    console.log('🟡 Setting up notification handlers...');
    initializeNotifications().catch(error => {
      console.error('🔴 Unhandled error in notification setup:', error);
    });

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