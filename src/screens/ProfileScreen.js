// ProfileScreen.js

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView, FlatList, ScrollView, RefreshControl, ActivityIndicator, Image 
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import api from '../services/api';
import LoginPromptModal from '../components/LoginModal';
import * as ImagePicker from 'expo-image-picker';
import ProfileTaskPost from '../components/ProfileTaskPost';
import { UserContext } from '../contexts/UserContext'; // Import UserContext
import NotificationDebug from '../components/NotificationDebug';

const ProfileScreen = ({ navigation }) => {
  const { user } = useContext(UserContext); // Consume UserContext to get the current user
  const route = useRoute();
  const { userId: paramUserId } = route.params || {};  // Optional userId parameter
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);  // State for refreshing
  const [profilePhoto, setProfilePhoto] = useState(null); // URI of the profile photo
  const [isUploading, setIsUploading] = useState(false);  // Loading state for upload
  const [tasksRequested, setTasksRequested] = useState([]);
  const [tasksCompleted, setTasksCompleted] = useState([]);
  const [averageRating, setAverageRating] = useState(null); 
  const [selectedTab, setSelectedTab] = useState('info'); // Initialize selectedTab
  const [hiddenTasks, setHiddenTasks] = useState([]);
  const [ratingsCount, setRatingsCount] = useState(0); // New state for ratingsCount
  const [tasksAssigned, setTasksAssigned] = useState(0);
  const [completionRate, setCompletionRate] = useState(null);  

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
// ProfileScreen.js
const fetchUserProfile = async () => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    try {
      let endpoint = '/users/profile'; // Default endpoint for current user
      if (paramUserId) {
        endpoint = `/users/${paramUserId}`; // Endpoint for other users
      }
      const response = await api.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (paramUserId) {
        setOtherUser(response.data); // Set otherUser only when viewing another user's profile
      } else {
        setOtherUser(null); // Clear otherUser when viewing own profile
      }
      setProfilePhoto(response.data.profilePhotoUrl || null); // Set profile photo URL
      setAverageRating(response.data.averageRating ? parseFloat(response.data.averageRating).toFixed(1) : null);
      setRatingsCount(response.data.ratingsCount || 0);
    } catch (error) {
      // Handle auth errors specifically, but keep using userToken
      if (error.response?.status === 401 || error.response?.status === 403) {
        if (paramUserId) {
          setOtherUser(null);
        }
        setProfilePhoto(null);
        setAverageRating(null);
        setRatingsCount(0);
      } else {
        console.error('Error fetching profile:', error);
      }
    }
  } else {
    if (paramUserId) {
      setOtherUser(null);
    }
    setProfilePhoto(null);
  }
};

  // Fetch user tasks
  const fetchUserTasks = async (userIdParam) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token && userIdParam) {
      try {
        // Fetch tasks where the user is the requester
        const requestedResponse = await api.get(`/tasks/user/${userIdParam}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Fetch tasks where the user has been the tasker
        const taskerResponse = await api.get(`/tasks/tasker/${userIdParam}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Fetch cancellations where the tasker is the one who canceled the task
        const cancellationsResponse = await api.get(`/cancellations/tasker/${userIdParam}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Extract tasks
        const requestedTasks = Array.isArray(requestedResponse.data.tasks)
          ? requestedResponse.data.tasks
          : [];

        const allTaskerTasks = Array.isArray(taskerResponse.data.tasks)
          ? taskerResponse.data.tasks
          : [];

        const taskerCancellations = Array.isArray(cancellationsResponse.data.cancellations)
          ? cancellationsResponse.data.cancellations
          : [];

        // Set tasks requested and tasks completed
        setTasksRequested(requestedTasks.filter(task => task.status === 'completed'));
        const completedTasks = allTaskerTasks.filter(task => task.status === 'completed');
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
          setCompletionRate(null); // No tasks assigned or canceled
        }

      } catch (error) {
        console.error('Error fetching user tasks:', error);
      }
    }
  };


  // Fetch hidden tasks
  const fetchHiddenTasks = async () => {
    try {
      // Retrieve the token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        console.error('No user token found.');
        Alert.alert('Error', 'User authentication token not found.');
        return;
      }


      // Make the API request to fetch hidden tasks
      const response = await api.get('/tasks/hidden', {
        headers: { Authorization: `Bearer ${token}` },
      });


      // Ensure tasks are fetched and handle the response correctly
      const fetchedHiddenTasks = Array.isArray(response.data.tasks) ? response.data.tasks : [];


      setHiddenTasks(fetchedHiddenTasks);

    } catch (error) {
      // Log the error response in detail
      console.error('Error fetching hidden tasks:', error.response ? error.response.data : error.message);

      Alert.alert('Error', 'Failed to fetch hidden tasks. Please try again later.');
      setHiddenTasks([]);
    }
  };

  // Use focus effect to fetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [paramUserId, user]) // Depend on `paramUserId` to refetch when viewing different profiles
  );

  // Fetch tasks when the displayedUser changes
  useEffect(() => {
    if (displayedUser && displayedUser.id) {
      fetchUserTasks(displayedUser.id); // Fetch tasks for the displayed user
      fetchHiddenTasks(); // Fetch hidden tasks for own profile or adjust if fetching others' hidden tasks
    }
  }, [displayedUser]);

  const handleLoginSuccess = async () => {
    setIsModalVisible(false);
    fetchUserProfile();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();  // Re-fetch user profile on refresh
    if (displayedUser && displayedUser.id) {
      await fetchUserTasks(displayedUser.id);     // Re-fetch tasks
    }
    await fetchHiddenTasks(); 
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
  const InfoTab = () => (
    <View style={styles.infoContainer}>
      <Text style={styles.infoTitle}>Location:</Text>
      <Text style={styles.infoText}>{displayedUser.location || 'Not specified'}</Text>

      <Text style={styles.infoTitle}>Experience:</Text>
      <Text style={styles.infoText}>{displayedUser.experience || 'Not specified'}</Text>

      <Text style={styles.infoTitle}>Age:</Text>
      <Text style={styles.infoText}>{displayedUser.age ? `${displayedUser.age} years old` : 'Not specified'}</Text>

      <Text style={styles.infoTitle}>Gender:</Text>
      <Text style={styles.infoText}>{displayedUser.gender || 'Not specified'}</Text>

      {/* Edit Profile Button */}
      {isOwnProfile && (
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => navigation.navigate('EditProfileScreen')}
        >
          <FontAwesome name="pencil" size={18} color="#3717ce" style={styles.editIcon} />
          <Text style={styles.editProfileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const RequestedTasksTab = () => (
    <View style={styles.tasksContainer}>
      {tasksRequested.length > 0 ? (
        tasksRequested.map(task => (
          <ProfileTaskPost
            key={task.id}
            task={task}
            loggedInUserId={displayedUser.id}
            showUserName={false}  // No need to show user name in the profile screen
            onHide={handleHideTask} 
            isOwnProfile={isOwnProfile}
            profileUser={displayedUser}
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
            loggedInUserId={displayedUser.id}
            showUserName={false}  // No need to show user name in the profile screen
            onHide={handleHideTask} 
            isOwnProfile={isOwnProfile}
            profileUser={displayedUser}
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

  // Handle Hide Task with confirmation
  const handleHideTask = (taskId) => {
    Alert.alert(
      'Confirm Hide',
      'Are you sure you want to hide this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Hide', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              await api.post(`/tasks/${taskId}/hide`, {}, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Success', 'Task hidden from your view.');
              fetchUserTasks(displayedUser.id); // Refresh the task list
              fetchHiddenTasks(); // Refresh hidden tasks
            } catch (error) {
              console.error('Error hiding task:', error);
              Alert.alert('Error', 'Failed to hide the task.');
            }
          } 
        },
      ],
      { cancelable: true }
    );
  };

  if (!displayedUser) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Background Gradient */}
        <View style={styles.gradientBackground}>
          <ScrollView contentContainerStyle={styles.contentContainer}
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

            {/* Statistics */}
            <View style={styles.statisticsContainer}>
              <View style={styles.statItem}>
                <FontAwesome name="tasks" size={24} color="#3717ce" />
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Requested</Text>
              </View>
              <View style={styles.statItem}>
                <FontAwesome name="check-circle" size={24} color="#3717ce" />
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Tasked</Text>
              </View>
              <View style={styles.statItem}>
                <FontAwesome name="line-chart" size={24} color="#3717ce" />
                <Text style={styles.statNumber}>
                  {completionRate !== null ? `${completionRate}%` : 'N/A'}
                </Text>
                <Text style={styles.statLabel}>Completion Rate</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity style={styles.loginButton} onPress={() => setIsModalVisible(true)}>
                <Text style={styles.loginButtonText}>Log In</Text>
              </TouchableOpacity>
            </View>

            {/* Sample Posts or Empty State */}
            <View style={styles.samplePostsContainer}>
              <Text style={styles.sectionTitle}>Your Tasks</Text>
              <View style={styles.emptyState}>
                <FontAwesome name="tasks" size={50} color="#e1e1e1" />
                <Text style={styles.emptyStateText}>No tasks posted yet.</Text>
                <TouchableOpacity style={styles.postTaskButton} onPress={() => navigation.navigate('CreateTask')}>
                  <Text style={styles.postTaskButtonText}>Post a Task</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Login Prompt Modal */}
          <LoginPromptModal
            visible={isModalVisible}
            onClose={() => setIsModalVisible(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NotificationDebug />
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

          {!isOwnProfile && (
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          )}
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={isOwnProfile ? selectProfilePhoto : null} style={styles.profilePhotoContainer}>
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
            <Text style={styles.profileName}>{displayedUser.firstName} {displayedUser.lastName}</Text>
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
            {/* Bio */}
            <Text style={styles.bioText}>{displayedUser.about || 'No bio available'}</Text>
          </View>

          {/* Statistics */}
          <View style={styles.statisticsContainer}>
            <View style={styles.statItem}>
              <FontAwesome name="tasks" size={24} color="#3717ce" />
              <Text style={styles.statNumber}>{tasksRequested.length}</Text>
              <Text style={styles.statLabel}>Requested</Text>
            </View>
            <View style={styles.statItem}>
              <FontAwesome name="check-circle" size={24} color="#3717ce" />
              <Text style={styles.statNumber}>{tasksCompleted.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <FontAwesome name="line-chart" size={24} color="#3717ce" />
              <Text style={styles.statNumber}>
                {completionRate !== null ? `${completionRate}%` : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Completion Rate</Text>
            </View>
          </View>

          {/* Settings and Archive Buttons */}
          <View style={styles.actionButtonsContainer}>
            {isOwnProfile && (
              <>
                <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('SettingsScreen')}>
                  <FontAwesome name="cog" size={24} color="#fff" />
                  <Text style={styles.settingsButtonText}>Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.archiveButton} onPress={() => navigation.navigate('HiddenTasksScreen')}>
                  <FontAwesome name="archive" size={24} color="#fff" />
                  <Text style={styles.archiveButtonText}>Archives</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => setSelectedTab('info')}
              style={selectedTab === 'info' ? styles.activeTab : styles.tab}
            >
              <Text style={styles.tabText}>Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab('requested')}
              style={selectedTab === 'requested' ? styles.activeTab : styles.tab}
            >
              <Text style={styles.tabText}>Requested</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab('completed')}
              style={selectedTab === 'completed' ? styles.activeTab : styles.tab}
            >
              <Text style={styles.tabText}>Completed</Text>
            </TouchableOpacity>
          </View>

          {/* Render Selected Tab Content */}
          {selectedTab === 'info' && <InfoTab />}
          {selectedTab === 'requested' && <RequestedTasksTab />}
          {selectedTab === 'completed' && <CompletedTasksTab />}
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
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    width: '100%',
    marginTop: 10,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  activeTab: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#3717ce',
  },
  tabText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
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
});
export default ProfileScreen;