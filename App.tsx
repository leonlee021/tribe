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
import { registerDeviceForNotifications } from './src/services/notificationService';
import { UIProvider } from './src/providers/UIProvider';

//import HomeScreen from './src/screens/HomeScreen'; // v1
import HomeScreen from './src/v2/screens/HomeScreen'; // v2
//import TabBar from './src/components/TabBar'; // v1
import TabBar from './src/v2/components/TabBar'; // v2
// import ActivityScreen from './src/screens/ActivityScreen'; // v1
import ActivityScreen from './src/v2/screens/ActivityScreen'; // v2
import ChatScreen from './src/screens/ChatScreen';
// import ProfileScreen from './src/screens/ProfileScreen'; // v1
import ProfileScreen from './src/v2/screens/ProfileScreen'; // v2
//import CustomScreen from './src/screens/CustomScreen'; // v1
//import CustomScreen from './src/v2/screens/CustomScreen'; // v2
import EditProfileScreen from './src/screens/EditProfileScreen';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AddCardScreen from './src/screens/AddCardScreen';
import HiddenTasksScreen from './src/screens/HiddenTasksScreen';
import MapScreen from './src/screens/MapScreen';

const firebaseConfig = {
  apiKey: "AIzaSyA3p9i_O2419jzmMwEs2HhuEygoYcF0u4g",
  authDomain: "mutually-39428.firebaseapp.com",
  projectId: "mutually-39428",
  storageBucket: "mutually-39428.appspot.com",
  messagingSenderId: "619460684766",
  appId: "1:619460684766:web:86ec0205fad1bec49b0b4f",
  measurementId: "G-M46K95WYMK"
};

const initializeFirebase = () => {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized');
  } else {
    console.log('Firebase already initialized');
  }
};

initializeFirebase();
  

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

export default function App() {
  const Stack = createStackNavigator();

  useEffect(() => {

    const setupApp = async () => {
      try {

        // Initialize Firebase if not already initialized
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
          console.log('Firebase initialized');
        }

        // Register device for notifications
        const registered = await registerDeviceForNotifications();
        if (registered) {
          console.log('Device successfully registered for notifications');
        } else {
          console.log('Failed to register device for notifications');
        }
      } catch (error) {
        console.error('Error setting up app:', error);
      }
    };

    setupApp();
  }, []);

  return (
    <StripeProvider publishableKey='pk_live_51Q2x7bGdzGxBezt1OVdOu1jJNemuxUmFEbUXdHuberB9Ps34hI9nbTLM7wzb75WvajXuqWsFj2rN4ysbGNjmBpzy00HU5DgB7s'>
    <UIProvider>
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
          {/* <Stack.Screen name = 'CustomScreen' component={CustomScreen} 
              options = {{
              headerShown: false,
              }}
          /> */}
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
          {/* <Stack.Screen 
            name='MapScreen' 
            component={MapScreen} 
            options={{ headerShown: false }}
          /> */}
        </Stack.Navigator>
        <TabBar 
          currentScreen="HomeScreen"
        />

      </SafeAreaProvider>
    </NotificationProvider>
    </NavigationContainer>
    </UserProvider>
    </UIProvider>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
