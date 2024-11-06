// src/handlers/NotificationHandler.js
import React, { useEffect, useContext } from 'react';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NotificationContext } from '../contexts/NotificationContext';
import { registerDeviceForNotifications } from '../services/notificationService';

const NotificationHandler = () => {
  const navigation = useNavigation();
  const { resetBadgeCounts, fetchNotifications } = useContext(NotificationContext);

  useEffect(() => {
    const setupNotifications = async () => {
      // Register device for notifications
      await registerDeviceForNotifications();

      // Handle notifications when app is in background
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Message handled in the background:', remoteMessage);
      });

      // Handle notifications when app is in foreground
      const unsubscribe = messaging().onMessage(async remoteMessage => {
        console.log('Received foreground message:', remoteMessage);
        fetchNotifications();
      });

      // Handle notification open
      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Notification opened app:', remoteMessage);
        if (remoteMessage.data?.type === 'activity') {
          navigation.navigate('ActivityScreen');
          resetBadgeCounts('activity');
        } else if (remoteMessage.data?.type === 'chat') {
          navigation.navigate('ChatScreen');
          resetBadgeCounts('chat');
        }
      });

      // Check if app was opened from a notification
      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          if (remoteMessage) {
            console.log('App opened from quit state:', remoteMessage);
            if (remoteMessage.data?.type === 'activity') {
              navigation.navigate('ActivityScreen');
              resetBadgeCounts('activity');
            } else if (remoteMessage.data?.type === 'chat') {
              navigation.navigate('ChatScreen');
              resetBadgeCounts('chat');
            }
          }
        });

      return unsubscribe;
    };

    setupNotifications();
  }, [navigation, resetBadgeCounts, fetchNotifications]);

  return null;
};

export default NotificationHandler;