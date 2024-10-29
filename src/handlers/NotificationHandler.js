// NotificationHandler.js

import React, { useEffect, useContext } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { NotificationContext } from '../contexts/NotificationContext';

const NotificationHandler = () => {
  const navigation = useNavigation();
  const { resetBadgeCounts, fetchNotifications } = useContext(NotificationContext);

  useEffect(() => {
    // Handle background notification tap
    const subscription = Notifications.addNotificationResponseReceivedListener(async response => {
      const notificationData = response.notification.request.content.data;
      console.log('Notification Response Data:', notificationData); // Debug log

      // Navigate based on the notification type
      if (notificationData.type === 'activity') {
        navigation.navigate('ActivityScreen');
      } else if (notificationData.type === 'chat') {
        navigation.navigate('ChatScreen');
      }

      // Fetch and update notifications after navigation
      await fetchNotifications();

      // Reset badge counts after navigating
      resetBadgeCounts(notificationData.type);
    });

    return () => subscription.remove();
  }, [navigation, resetBadgeCounts, fetchNotifications]);

  return null;
};

export default NotificationHandler;
