import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators, StackNavigationOptions } from '@react-navigation/stack';
import { StripeProvider } from '@stripe/stripe-react-native';
import firebase from '@react-native-firebase/app';
import { UserProvider } from './src/contexts/UserContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import NotificationHandler from './src/handlers/NotificationHandler';
import * as Notifications from 'expo-notifications';

import HomeScreen from './src/screens/HomeScreen';
import TabBar from './src/components/TabBar';
import ActivityScreen from './src/screens/ActivityScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CustomScreen from './src/screens/CustomScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AddCardScreen from './src/screens/AddCardScreen';
import HiddenTasksScreen from './src/screens/HiddenTasksScreen';

const config = {
    animation: 'timing' as const, // Ensures 'timing' is a literal type
    config: {
      duration: 0,
    },
  };  

const options = {
  transitionSpec: {
    open: config,
    close: config,
  },
  cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
  cardStyle: { opacity: 1 },
};

const firebaseConfig = {
  apiKey: "AIzaSyA3p9i_O2419jzmMwEs2HhuEygoYcF0u4g",
  authDomain: "mutually-39428.firebaseapp.com",
  projectId: "mutually-39428",
  storageBucket: "mutually-39428.appspot.com",
  messagingSenderId: "619460684766",
  appId: "1:619460684766:web:86ec0205fad1bec49b0b4f",
  measurementId: "G-M46K95WYMK"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  

// Register for notifications and handle permissions
async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Expo Push Token:', token);
  return token;
}


export default function App() {
  const Stack = createStackNavigator();

  useEffect(() => {
    registerForPushNotificationsAsync();

    // Set notification handler to control notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }, []);

  return (
    <StripeProvider publishableKey='pk_live_51Q2x7bGdzGxBezt1OVdOu1jJNemuxUmFEbUXdHuberB9Ps34hI9nbTLM7wzb75WvajXuqWsFj2rN4ysbGNjmBpzy00HU5DgB7s'>
    <UserProvider>
    <NavigationContainer>
    <NotificationProvider>
    <NotificationHandler /> 
      <SafeAreaProvider style={styles.container}>
        <Stack.Navigator screenOptions={options}>
          <Stack.Screen name = 'HomeScreen' component={HomeScreen} 
            options = {{
              headerShown: false,
            }}
          /> 
          <Stack.Screen 
            name='ActivityScreen' 
            component={ActivityScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name='ChatScreen' 
            component={ChatScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen name = 'ChatDetailScreen' component={ChatDetailScreen} 
              options = {{
              headerShown: false,
              }}
          />
          <Stack.Screen name = 'ProfileScreen' component={ProfileScreen} 
              options = {{
              headerShown: false,
              }}
          />
          <Stack.Screen name = 'EditProfileScreen' component={EditProfileScreen} 
              options = {{
              headerShown: false,
              }}
          />
          <Stack.Screen name = 'CustomScreen' component={CustomScreen} 
              options = {{
              headerShown: false,
              }}
          />
          <Stack.Screen name = 'SettingsScreen' component={SettingsScreen} 
              options = {{
              headerShown: false,
              }}
          />
          <Stack.Screen name = 'AddCardScreen' component={AddCardScreen} 
              options = {{
              headerShown: false,
              }}
          />
          <Stack.Screen name = 'HiddenTasksScreen' component={HiddenTasksScreen} 
              options = {{
              headerShown: false,
              }}
          />
        </Stack.Navigator>
        <TabBar 
          currentScreen="HomeScreen"
        />

      </SafeAreaProvider>
    </NotificationProvider>
    </NavigationContainer>
    </UserProvider>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
