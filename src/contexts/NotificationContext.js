// NotificationContext.js
import React, { createContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import { fetchNotifications } from '../services/notificationService';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const NotificationContext = createContext();

// NotificationContext.js
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [badgeCounts, setBadgeCounts] = useState({
    activity: 0,
    chat: 0,
  });
  const [isNotificationSetup, setIsNotificationSetup] = useState(false);

  const updateBadgeCounts = useCallback(() => {
    const chatCount = notifications.filter(n => n.type === 'chat' && !n.isRead).length;
    const activityCount = notifications.filter(n => n.type === 'activity' && !n.isRead).length;

    console.log('Updating badge counts:', { chat: chatCount, activity: activityCount });
    
    setBadgeCounts({
      chat: chatCount,
      activity: activityCount
    });
  }, [notifications]);

  const handleNewNotification = useCallback((remoteMessage) => {
    console.log('Handling new notification in context:', remoteMessage);
    
    const type = remoteMessage?.data?.type;
    const messageId = remoteMessage.messageId;
    
    if (!type) {
      console.log('No type in notification data');
      return;
    }

    setNotifications(prev => {
      // Check if notification already exists
      if (prev.some(n => n.id === messageId)) {
        console.log('Notification already exists:', messageId);
        return prev;
      }

      const newNotification = {
        id: messageId,
        type: type,
        chatId: remoteMessage.data?.chatId,
        taskId: remoteMessage.data?.taskId,
        message: remoteMessage.data?.messageType || 'new message',
        isRead: false,
        createdAt: new Date().toISOString()
      };

      console.log('Adding new notification:', newNotification);
      return [newNotification, ...prev];
    });
  }, []);

  // Update badge counts whenever notifications change
  useEffect(() => {
    console.log('Notifications changed, updating badge counts');
    updateBadgeCounts();
  }, [notifications, updateBadgeCounts]);

  const fetchAndSetNotifications = useCallback(async () => {
    try {
      const allNotifications = await fetchNotifications();
      console.log('Fetched notifications:', allNotifications);
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  useEffect(() => {
    if (!isNotificationSetup) {
      console.log('Setting up initial notifications');
      fetchAndSetNotifications();
      setIsNotificationSetup(true);
    }
  }, [isNotificationSetup, fetchAndSetNotifications]);

  const markAsRead = useCallback((id) => {
    console.log('Marking notification as read:', id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const contextValue = useMemo(() => ({
    notifications,
    badgeCounts,
    handleNewNotification,
    fetchNotifications: fetchAndSetNotifications,
    markAsRead,
  }), [notifications, badgeCounts, handleNewNotification, fetchAndSetNotifications, markAsRead]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};