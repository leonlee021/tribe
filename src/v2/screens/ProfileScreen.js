// ProfileScreen.js

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView, FlatList, ScrollView, RefreshControl, ActivityIndicator, Image 
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import LoginPromptModal from '../../components/LoginModal';
import * as ImagePicker from 'expo-image-picker';
import ProfileTaskPost from '../components/ProfileTaskPost';
import { UserContext } from '../../contexts/UserContext'; // Import UserContext
import NotificationDebug from '../../components/NotificationDebug';
import authService from '../../services/authService';

const ProfileScreen = ({ navigation }) => {
  const { user, setUser, fetchUserProfile } = useContext(UserContext); // Consume UserContext to get the current user
  const route = useRoute();
  const { userId: paramUserId } = route.params || {};  // Optional userId parameter
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);  // State for refreshing
  const [profilePhoto, setProfilePhoto] = useState(null); // URI of the profile photo
  const [isUploading, setIsUploading] = useState(false);  // Loading state for upload
  const [tasksRequested, setTasksRequested] = useState([]);
  const [tasksCompleted, setTasksCompleted] = useState([]);
  const [averageRating, setAverageRating] = useState(null); 
  const [selectedTab, setSelectedTab] = useState('requested'); // Initialize selectedTab
  const [hiddenTasks, setHiddenTasks] = useState([]);
  const [ratingsCount, setRatingsCount] = useState(0); // New state for ratingsCount
  const [tasksAssigned, setTasksAssigned] = useState(0);
  const [completionRate, setCompletionRate] = useState(null);  
  const [profileVersion, setProfileVersion] = useState(0);

  const isOwnProfile = !paramUserId;
  const [otherUser, setOtherUser] = useState(null); // State for other user's profile

  // Determine which user to display
  const displayedUser = paramUserId ? otherUser : user;

  const canGoBack = navigation.canGoBack(); // Check if there is a previous screen to go back to
  const handleBackPress = () => {
    if (canGoBack) {
      navigation.goBack(); // Navigate back to the previous screen
    }
  };


  // Fetch user profile
  const loadProfileData = async () => {
    try {
      if (paramUserId) {
        // For other users' profiles
        const response = await api.get(`/users/${paramUserId}`);
        if (response?.data) {
          setOtherUser(response.data);
          setProfilePhoto(response.data.profilePhotoUrl || null);
          setAverageRating(response.data.averageRating ? parseFloat(response.data.averageRating).toFixed(1) : null);
          setRatingsCount(response.data.ratingsCount || 0);
        }
      } else {
        // For own profile, use context's fetchUserProfile
        await fetchUserProfile();
      }
    } catch (error) {
      if (!error.response || (error.response.status !== 401 && error.response.status !== 403)) {
        console.error('Error loading profile:', error);
      }
    }
  };

  // Fetch user tasks
  const fetchUserTasks = async (userIdParam) => {
    if (!userIdParam) return;

    // console.log('Fetching tasks for user:', userIdParam);
  
    const [requestedResponse, taskerResponse, cancellationsResponse] = await Promise.all([
        authService.fetchWithSilentAuth(() => api.get(`/tasks/user/${userIdParam}`)),
        authService.fetchWithSilentAuth(() => api.get(`/tasks/tasker/${userIdParam}`)),
        authService.fetchWithSilentAuth(() => api.get(`/cancellations/tasker/${userIdParam}`))
    ]);

    // console.log('Requested tasks:', requestedResponse?.data);
    // console.log('Tasker tasks:', taskerResponse?.data);
  
    // Extract tasks with null checks
    const requestedTasks = requestedResponse?.data?.tasks || [];
    const allTaskerTasks = taskerResponse?.data?.tasks || [];
    const taskerCancellations = cancellationsResponse?.data?.cancellations || [];

    const sortedRequestedTasks = requestedTasks
      .filter(task => task.deleted === false)
      .sort((a, b) => {
        // First sort by completion status
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        // Then sort by date for tasks with the same completion status
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    

    const completedTasks = allTaskerTasks
      .filter(task => task.deleted === false)
      .sort((a, b) => {
        // First sort by completion status
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        // Then sort by date for tasks with the same completion status
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  
    // Set tasks requested and tasks completed
    setTasksRequested(sortedRequestedTasks);
    setTasksCompleted(completedTasks);
  
    // Set tasksAssigned
    setTasksAssigned(allTaskerTasks.length);
  
    // Calculate Completion Rate
    const canceledByTaskerCount = taskerCancellations.length;
    const completedByTaskerCount = completedTasks.length;
  
    if (completedByTaskerCount + canceledByTaskerCount > 0) {
      const rate = ((completedByTaskerCount / (completedByTaskerCount + canceledByTaskerCount)) * 100).toFixed(1);
      setCompletionRate(rate);
    } else {
      setCompletionRate(null);
    }
  };


  // Fetch hidden tasks
  const fetchHiddenTasks = async () => {
    const response = await authService.fetchWithSilentAuth(() => api.get('/tasks/hidden'));
    // Properly handle null response and data structure
    if (response?.data?.tasks) {
        setHiddenTasks(response.data.tasks);
    } else {
        setHiddenTasks([]);
    }
};

  // Use focus effect to fetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [paramUserId, route.params?.refresh])
  );

  // Fetch tasks when the displayedUser changes
  useEffect(() => {
    if (displayedUser && displayedUser.id) {
      fetchUserTasks(displayedUser.id); // Fetch tasks for the displayed user
      fetchHiddenTasks(); // Fetch hidden tasks for own profile or adjust if fetching others' hidden tasks
    }
  }, [displayedUser]);

  useEffect(() => {
    if (!paramUserId && user) {
      setProfilePhoto(user.profilePhotoUrl || null);
      setAverageRating(user.averageRating ? parseFloat(user.averageRating).toFixed(1) : null);
      setRatingsCount(user.ratingsCount || 0);
    }
  }, [user, paramUserId]);

  const handleLoginSuccess = async () => {
    setIsModalVisible(false);
    fetchUserProfile();
    // setTestTokenExpiry();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    if (displayedUser && displayedUser.id) {
      await fetchUserTasks(displayedUser.id);
      await fetchHiddenTasks();
    }
    setRefreshing(false);
  };

  const selectProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to make this work!');
      return;
    }
  
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  
    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri); // Update the profile photo state
      uploadProfilePhoto(result.assets[0].uri); // Upload the photo
    } else {
      console.log('User canceled image picker');
    }
  };

  const uploadProfilePhoto = async (uri) => {
    setIsUploading(true);
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert('Error', 'You must be logged in to upload a profile photo.');
      setIsUploading(false);
      return;
    }
  
    const formData = new FormData();
    formData.append('profilePhoto', {
      uri,
      type: 'image/jpeg', // Adjust based on the image type
      name: 'profilePhoto.jpg',
    });
  
    try {
      const response = await api.post('/users/profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Upload response:', response.data);

      if (response.status === 200) {
        Alert.alert('Success', 'Profile photo updated successfully.');
        setProfilePhoto(response.data.profilePhotoUrl); // Update the profile photo URL
        fetchUserProfile();
      } else {
        Alert.alert('Error', 'Failed to update profile photo.');
      }
    } catch (error) {
      console.error('Error uploading profile photo:', error.response ? error.response.data : error.message);
      Alert.alert('Error', 'An error occurred while uploading the profile photo.');
    } finally {
      setIsUploading(false);
    }
  };

  // Define the Tab Content Components

  const RequestedTasksTab = () => (
    <View style={styles.tasksContainer}>
      {tasksRequested.length > 0 ? (
        tasksRequested.map(task => (
          <ProfileTaskPost
            key={task.id}
            task={task}
            loggedInUserId={user.id}
            showUserName={false}
            onHide={handleHideTask} 
            isOwnProfile={isOwnProfile}
            profileUser={displayedUser}
            onMarkComplete={(chatId) => handleCompleteTask(chatId)}
            onCancelTask={(chatId) => handleCancelTask(chatId)}
            onViewChat={(chatId) => handleViewChat(chatId)}
            onViewProfile={(userId) => handleViewProfile(userId)}
            onAcceptOffer={(offerId) => handleAcceptOffer(offerId)}
            onDeleteTask={(taskId) => handleDeleteTask(taskId)}
            isTaskOwner={task.userId === user.id} 
            onLeaveReview={(taskId) => handleLeaveReview(taskId)}
          />
        ))
      ) : (
        <Text style={styles.emptyText}>No tasks requested.</Text>
      )}
    </View>
  );

  const CompletedTasksTab = () => (
    <View style={styles.tasksContainer}>
      {tasksCompleted.length > 0 ? (
        tasksCompleted.map(task => (
          <ProfileTaskPost
            key={task.id}
            task={task}
            loggedInUserId={user.id}
            showUserName={false}
            onHide={handleHideTask} 
            isOwnProfile={isOwnProfile}
            profileUser={displayedUser}
            onMarkComplete={(chatId) => handleCompleteTask(chatId)}
            onCancelTask={(chatId) => handleCancelTask(chatId)}
            onViewChat={(chatId) => handleViewChat(chatId)}
            onViewProfile={(userId) => handleViewProfile(userId)}
            onAcceptOffer={(offerId) => handleAcceptOffer(offerId)}
            onDeleteTask={(taskId) => handleDeleteTask(taskId)}
            isTaskOwner={task.userId === user.id} 
            onLeaveReview={(taskId) => handleLeaveReview(taskId)}
          />
        ))
      ) : (
        <Text style={styles.emptyText}>No tasks completed.</Text>
      )}
    </View>
  );

  const renderStars = (rating) => {
    if (!rating) return null; // Don't render stars if there's no rating
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    const stars = [];
  
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FontAwesome key={i} name="star" size={20} color="#FFD700" style={styles.starIcon} />);
      } else if (i === fullStars + 1 && halfStar) {
        stars.push(<FontAwesome key={i} name="star-half-o" size={20} color="#FFD700" style={styles.starIcon} />);
      } else {
        stars.push(<FontAwesome key={i} name="star-o" size={20} color="#FFD700" style={styles.starIcon} />);
      }
    }
  
    return stars;
  };

  const testNotification = async () => {
    try {
      const response = await fetch('https://mutually-618cad73c12d.herokuapp.com/notifications/test', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + await AsyncStorage.getItem('userToken'),
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log('Test notification response:', data);
    } catch (error) {
      console.error('Error testing notification:', error);
    }
  };

// Add this somewhere in your ProfileScreen:
const logToken = async () => {
    const token = await AsyncStorage.getItem('userToken');
    // console.log('Auth Token:', token);
  };
  
  // Call it:
  useEffect(() => {
    logToken();
  }, []);

  // Handle Hide Task with confirmation
  const handleHideTask = (taskId) => {
    Alert.alert(
      'Confirm Archive',
      'Are you sure you want to archive this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Archive', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              await api.post(`/tasks/${taskId}/hide`, {}, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Success', 'Task archived from your view.');
              fetchUserTasks(displayedUser.id); // Refresh the task list
              fetchHiddenTasks(); // Refresh hidden tasks
            } catch (error) {
              console.error('Error archiving task:', error);
              Alert.alert('Error', 'Failed to archive the task.');
            }
          } 
        },
      ],
      { cancelable: true }
    );
  };

  const handleViewChat = (chatId, taskId) => {
    navigation.navigate('ChatDetailScreen', { chatId });
  };

  const handleViewProfile = (userId) => {
    navigation.navigate('ProfileScreen', { userId });
};

const handleAcceptOffer = async (offerId) => {
    console.log('Accepting offer:', offerId);
    try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
            Alert.alert('Error', 'You must be logged in to accept an offer.');
            return;
        }

        const response = await api.post(
            `/offers/accept/${offerId}`, 
            {}, 
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        console.log('Offer acceptance response:', response.data);

        if (response.status === 200) {
            Alert.alert('Offer Accepted', 'You have accepted the offer.');
            //await fetchTasks(); // Refresh tasks to reflect changes
            // Navigate to the ChatDetailScreen if needed
        } else {
            Alert.alert('Error', 'Failed to accept the offer.');
        }
    } catch (error) {
        console.error('Error accepting offer:', error.response || error.message);
        Alert.alert('Error', 'Failed to accept the offer.');
    }
};

const handleCompleteTask = async (chatId) => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) throw new Error('User token not found');

        const response = await api.post(
            `/chats/complete`, 
            { chatId }, 
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (response.status === 200) {
            // setChatDetails(prevDetails => ({ ...prevDetails, status: 'completed' }));
            Alert.alert('Task Completed', 'You have marked the task as completed.');
        }
    } catch (error) {
        if (error.response) {
            console.error('Error completing task:', error.response.data);
            Alert.alert('Error', error.response.data.error || 'Failed to complete the task.');
        } else {
            console.error('Error completing task:', error.message);
            Alert.alert('Error', 'Failed to complete the task.');
        }
    }
};

  if (!displayedUser) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Background Gradient */}
        <View style={styles.gradientBackground}>
          <ScrollView 
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3717ce']}
              />
            }
          >
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <FontAwesome name="user-circle" size={100} color="#9999" />
              <Text style={styles.guestUsername}>Guest User</Text>
              <Text style={styles.guestBio}>
                Explore tasks, apply your skills, and make meaningful connections.
              </Text>
            </View>

            {/* Login Button */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={styles.loginButton} 
                onPress={() => setIsModalVisible(true)}
              >
                <Text style={styles.loginButtonText}>Log In</Text>
              </TouchableOpacity>
            </View>

            {/* Login Modal */}
            <LoginPromptModal
              visible={isModalVisible}
              onClose={() => setIsModalVisible(false)}
              onLoginSuccess={handleLoginSuccess}
            />
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // Main return for logged-in user
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradientBackground}>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3717ce']}
            />
          }
        >
          {!isOwnProfile && (
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          )}
          
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              onPress={isOwnProfile ? selectProfilePhoto : null} 
              style={styles.profilePhotoContainer}
            >
              {profilePhoto ? (
                <Image 
                  source={{ uri: profilePhoto }} 
                  style={styles.profilePhoto} 
                  cache="reload" 
                />
              ) : (
                <FontAwesome name="user-circle" size={100} color="#9999" />
              )}
              {isOwnProfile && (
                <View style={styles.editIconContainer}>
                  <FontAwesome name="pencil" size={20} color="#fff" />
                </View>
              )}
              {isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.profileName}>
              {displayedUser.firstName} {displayedUser.lastName}
            </Text>
            
            {/* Average Rating */}
            <View style={styles.ratingContainer}>
              {averageRating ? (
                <View style={styles.ratingContent}>
                  <Text style={styles.ratingNumberText}>
                    {`${averageRating}`}
                  </Text>
                  {renderStars(parseFloat(averageRating))}
                  <Text style={styles.reviewCountText}>
                    {` (${ratingsCount})`}
                  </Text>
                </View>
              ) : (
                <Text style={styles.emptyText}>No ratings yet.</Text>
              )}
            </View>
          </View>

          {/* Settings Button */}
          {isOwnProfile && (
            <TouchableOpacity 
                style={styles.settingsButton} 
                onPress={() => navigation.navigate('SettingsScreen')}
            >
                <FontAwesome name="cog" size={40} color="#3717ce" />
            </TouchableOpacity>
            )}

          {/* My Tasks Section */}
          <View style={styles.tasksSection}>
            <Text style={styles.tasksSectionTitle}>My Tasks</Text>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                onPress={() => setSelectedTab('requested')}
                style={[styles.tab, selectedTab === 'requested' && styles.activeTab]}
              >
                <Text style={[styles.tabText, selectedTab === 'requested' && styles.activeTabText]}>
                  Requester
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedTab('completed')}
                style={[styles.tab, selectedTab === 'completed' && styles.activeTab]}
              >
                <Text style={[styles.tabText, selectedTab === 'completed' && styles.activeTabText]}>
                  Tasker
                </Text>
              </TouchableOpacity>
            </View>

            {/* Render Selected Tab Content */}
            {selectedTab === 'requested' && <RequestedTasksTab />}
            {selectedTab === 'completed' && <CompletedTasksTab />}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradientBackground: {
    flex: 1,
    paddingVertical: 20,
  },
  contentContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  profilePhotoContainer: {
    position: 'relative',
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3717ce',
    borderRadius: 15,
    padding: 5,
  },
  backButton: {
    position: 'absolute',
    top: 5, // Set to 20 to ensure it's aligned just under the top of the screen
    left: 10, // Left aligns it to the left edge of the screen
    padding: 10, // Add padding for touchable area
    //backgroundColor: 'rgba(0, 0, 0, 0.1)', // Slight background color for visibility
    borderRadius: 20, // Rounded corners for aesthetics
    zIndex: 10, // Ensure it stays on top of other elements
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    color: '#fff',
    marginTop: 10,
  },
  profileName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginTop: 10,
  },
  bioText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  ratingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 5,
  },
  reviewCountText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 5,
  },
  starIcon: {
    marginRight: 2,
  },
  statisticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginVertical: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginVertical: 10,
  },
  settingsButton: {
    position: 'absolute',
    top: 0,
    right: 10,
    padding: 12, // Increased padding for larger touch target
    zIndex: 10,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3717ce',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#3717ce',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  archiveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 30,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3717ce',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  infoContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    width: '100%',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 15,
  },
  tasksContainer: {
    padding: 15,
    width: '100%',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#777',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#3717ce',
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#3717ce',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8, // For Android shadow
    marginTop: 10,
    width: 150,
  },
  editIcon: {
    marginRight: 8,
  },
  editProfileButtonText: {
    color: '#3717ce',
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 10,
  },
  loginButton: {
    backgroundColor: '#3717ce',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    shadowColor: '#3717ce',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8, // For Android shadow
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  guestUsername: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginTop: 10,
  },
  guestBio: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  samplePostsContainer: {
    width: '100%',
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
    textAlign: 'left',
    paddingLeft: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3, // For Android shadow
  },
  activeTabText: {
    color: '#3717ce',
    fontWeight: '700',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#777',
    marginTop: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  postTaskButton: {
    backgroundColor: '#3717ce',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
    shadowColor: '#3717ce',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8, // For Android shadow
  },
  postTaskButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  tasksSection: {
    width: '100%',
    marginTop: 20,
  },
  tasksSectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
});
export default ProfileScreen;