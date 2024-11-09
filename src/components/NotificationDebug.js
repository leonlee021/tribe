// src/components/NotificationDebug.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { getFcmToken, updateFcmToken, debugTokens } from '../services/notificationService';

const NotificationDebug = () => {
  const [debugInfo, setDebugInfo] = useState({});

  const checkTokens = async () => {
    const tokens = await debugTokens();
    setDebugInfo(tokens);
  };

  const refreshToken = async () => {
    const newToken = await getFcmToken();
    if (newToken) {
      await updateFcmToken(newToken);
      await checkTokens();
    }
  };

  useEffect(() => {
    checkTokens();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Debug Info</Text>
      <Text style={styles.info}>FCM Token: {debugInfo.fcmToken || 'None'}</Text>
      <Text style={styles.info}>User Token Present: {debugInfo.hasUserToken ? 'Yes' : 'No'}</Text>
      <Button title="Refresh Token" onPress={refreshToken} />
      <Button title="Check Tokens" onPress={checkTokens} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    margin: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    marginBottom: 8,
  },
});

export default NotificationDebug;