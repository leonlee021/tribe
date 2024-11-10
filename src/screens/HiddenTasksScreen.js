// HiddenTasksScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, RefreshControl, ActivityIndicator, SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import ProfileTaskPost from '../components/ProfileTaskPost';
import { useFocusEffect } from '@react-navigation/native';

const HiddenTasksScreen = ({ navigation }) => {
  const [hiddenTasks, setHiddenTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch hidden tasks
  const fetchHiddenTasks = async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      console.error('No user token found.');
      Alert.alert('Error', 'User authentication token not found.');
      setHiddenTasks([]);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/tasks/hidden', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedHiddenTasks = Array.isArray(response.data.tasks) ? response.data.tasks : [];
      setHiddenTasks(fetchedHiddenTasks);
    } catch (error) {
      console.error('Error fetching hidden tasks:', error.response ? error.response.data : error.message);
      Alert.alert('Error', 'Failed to fetch hidden tasks. Please try again later.');
      setHiddenTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Use focus effect to fetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchHiddenTasks();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHiddenTasks();
    setRefreshing(false);
  };

  // Handle Unhide Task
  const handleUnhideTask = (taskId) => {
    Alert.alert(
      'Confirm Unarchive',
      'Are you sure you want to unarchive this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unarchive', 
          style: 'default', 
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              await api.post(`/tasks/${taskId}/unhide`, {}, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Success', 'Task unhidden.');
              fetchHiddenTasks(); // Refresh hidden tasks
            } catch (error) {
              console.error('Error unhiding task:', error);
              Alert.alert('Error', 'Failed to unhide the task.');
            }
          } 
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-left" size={24} color="#1DA1F2" />
      </TouchableOpacity>
  
      {loading ? (
        <ActivityIndicator size="large" color="#1DA1F2" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1DA1F2']}
            />
          }
        >
          <Text style={styles.headerTitle}>Archived Tasks</Text>
          {hiddenTasks.length > 0 ? (
            hiddenTasks.map(task => (
              <ProfileTaskPost
                key={task.id}
                task={task}
                loggedInUserId={task.userId} // Assuming the owner is the logged-in user
                onUnhide={handleUnhideTask}
                isOwnProfile={true} // Indicates it's the user's own archived tasks
                isHiddenTask={true} // Indicates it's a hidden task
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No archived tasks.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default HiddenTasksScreen;

// Define styles here or import them if they are defined elsewhere
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
  },
  scrollContainer: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1DA1F2',
    marginBottom: 15,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#777',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15, // Adds space below the button
    marginLeft: 15,
  },
});
