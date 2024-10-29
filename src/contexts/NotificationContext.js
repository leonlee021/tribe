// NotificationContext.js

import React, { createContext, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { fetchNotifications } from '../services/notificationService';
import { AppState } from 'react-native';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [badgeCounts, setBadgeCounts] = useState({
    activity: 0,
    chat: 0,
  });

  // Function to fetch notifications and update state
  const fetchAndSetNotifications = async () => {
    try {
      const allNotifications = await fetchNotifications(); // Fetch notifications
      console.log('Fetched Notifications:', allNotifications); // Debug log

      setNotifications(allNotifications); // Update notifications state

      // Update badge counts
      const activityNotifications = allNotifications.filter(n => n.type === 'activity');
      const chatNotifications = allNotifications.filter(n => n.type === 'chat');

      setBadgeCounts({
        activity: activityNotifications.length,
        chat: chatNotifications.length,
      });

      console.log('Badge Counts Updated:', {
        activity: activityNotifications.length,
        chat: chatNotifications.length,
      }); // Debug log
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchAndSetNotifications();

    // Handle foreground notifications
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const newNotification = notification.request.content.data;
      console.log('Received Notification:', newNotification); // Debug log
      setNotifications(prev => [newNotification, ...prev]);

      // Update badge counts based on the notification type
      if (newNotification.type === 'activity') {
        setBadgeCounts(prev => ({
          ...prev,
          activity: prev.activity + 1,
        }));
      } else if (newNotification.type === 'chat') {
        setBadgeCounts(prev => ({ ...prev, chat: prev.chat + 1 }));
      }
    });

    // Handle app state changes
    const appStateListener = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('App has come to the foreground');
        fetchAndSetNotifications();
      }
    });

    return () => {
      subscription.remove();
      appStateListener.remove();
    };
  }, []);

  // Function to reset badge counts
  const resetBadgeCounts = (type) => {
    if (type === 'activity') {
      setBadgeCounts(prev => ({ ...prev, activity: 0 }));
    } else if (type === 'chat') {
      setBadgeCounts(prev => ({ ...prev, chat: 0 }));
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        badgeCounts,
        fetchNotifications: fetchAndSetNotifications, // Expose fetchAndSetNotifications
        resetBadgeCounts, // Expose resetBadgeCounts
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
