import React, { useState, useEffect, useContext } from 'react';
import { 
    StyleSheet, Text, View, SafeAreaView, FlatList, 
    TouchableOpacity, Alert, ActivityIndicator, Modal, TouchableWithoutFeedback, TextInput
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { UserContext } from '../contexts/UserContext';
import DetailedTaskPost from '../components/DetailedTaskPost';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { NotificationContext } from '../contexts/NotificationContext';
import { clearTaskNotifications } from '../services/notificationService';
import { fetchWithSilentAuth } from '../services/authService';

const ActivityScreen = () => {
    const navigation = useNavigation();
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('Requester'); // State to toggle between Requester and Tasker tabs]
    const [isReasonModalVisible, setIsReasonModalVisible] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [taskToCancel, setTaskToCancel] = useState(null); 
    const { badgeCounts, setBadgeCounts, resetBadgeCounts, notifications, fetchNotifications } = useContext(NotificationContext);  // Access badgeCounts from context

    // Fetch user from UserContext
    const { user } = useContext(UserContext);

    // Fetch user notifications when the screen loads
    useEffect(() => {
        console.log('ActivityScreen: useEffect called'); 
        const fetchData = async () => {
            try {
                // Fetch notifications
                await fetchNotifications(); 
                await fetchTasks(); 
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false); // Stop the loading indicator once data fetching completes
            }
        };
    
        fetchData(); // Call the async function to fetch data
    }, []); // No need for taskId here

    // Function to get the notification count for a specific task
    const getTaskNotificationCount = (taskId) => {
        const offerNotifications = notifications.filter(
          (n) => n.taskId === taskId && n.message === 'received offer'
        ).length;
      
        const acceptedNotifications = notifications.filter(
          (n) => n.taskId === taskId && n.message === 'offer accepted'
        ).length;

        const cancelledNotifications = notifications.filter(
            (n) => n.taskId === taskId && n.message === 'task cancelled'
        ).length;

        const completedNotifications = notifications.filter(
            (n) => n.taskId === taskId && n.message === 'task completed'
        ).length;
      
        return { offerNotifications, acceptedNotifications, cancelledNotifications, completedNotifications };
      };

    // Function to get total notifications for Requester and Tasker tabs
    const getTotalTabNotifications = () => {
        const requesterTasks = tasks.filter(task => task.userId === user?.id);
        const taskerTasks = tasks.filter(task => 
            task.taskerAcceptedId === user?.id ||
            (task.offers && task.offers.some(offer => offer.taskerId === user?.id && offer.status === 'cancelled'))
        );
    
        const requesterNotificationCount = requesterTasks.reduce((total, task) => {
            const { offerNotifications, cancelledNotifications } = getTaskNotificationCount(task.id);
            return total + offerNotifications + cancelledNotifications;
        }, 0);
    
        const taskerNotificationCount = taskerTasks.reduce((total, task) => {
            const { acceptedNotifications, cancelledNotifications, completedNotifications } = getTaskNotificationCount(task.id);
            return total + acceptedNotifications + cancelledNotifications + completedNotifications;
        }, 0);

    
        return { requesterNotificationCount, taskerNotificationCount };
    };

    const { requesterNotificationCount, taskerNotificationCount } = getTotalTabNotifications();
      
    const fetchHasSubmittedReview = async (taskId) => {
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (!token) throw new Error('User token not found');
      
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
          const response = await api.get(`/tasks/${taskId}/review-status`, { headers });
      
          return response.data.hasSubmittedReview;
        } catch (error) {
          console.error('Error checking review status:', error);
          return false; // Default to false if there's an error
        }
      };
      

      const fetchTasks = async () => {
        const response = await fetchWithSilentAuth(async () => {
          return api.get('/tasks');
        });
      
        if (response && response.data) {
          // Sort tasks so those with notifications appear at the top
          const tasksWithNotifications = response.data.map(task => {
            const { offerNotifications, acceptedNotifications, cancelledNotifications, completedNotifications } = 
              getTaskNotificationCount(task.id);
            return {
              ...task,
              hasNotification: offerNotifications > 0 || 
                              acceptedNotifications > 0 || 
                              cancelledNotifications > 0 || 
                              completedNotifications > 0
            };
          }).sort((a, b) => b.hasNotification - a.hasNotification);
      
          console.log('Tasks fetched in ActivityScreen:', tasksWithNotifications);
          setTasks(tasksWithNotifications);
        } else {
          setTasks([]);
        }
      };
    


    const handleCancelTask = (chatId) => {
        setTaskToCancel(chatId); // Store the chatId of the task to cancel
        setIsReasonModalVisible(true); // Show the modal
    };
    
    // Function to confirm and process the cancellation
    const confirmCancelTask = async (chatId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) throw new Error('User token not found');
    
            const response = await api.post('/chats/cancelTask', {
                chatId: chatId, // Pass chatId instead of taskId
                reason: cancellationReason || null, // User-provided reason
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
    
            if (response.status === 200) {
                Alert.alert('Task Canceled', 'The task has been canceled and reverted to offered status.');
                await fetchTasks(); // Refresh tasks to reflect the canceled status
                setCancellationReason('');
                setIsReasonModalVisible(false);
            }
        } catch (error) {
            console.error('Error canceling task:', error.message);
            Alert.alert('Error', 'Failed to cancel the task.');
        }
    };

    const clearOfferNotifications = async (taskId) => {
        try {
            await clearTaskNotifications('received offer', taskId);
            await fetchNotifications();
        } catch (error) {
            console.error('Error clearing offer notifications:', error);
        }
    };

    const clearAcceptedNotifications = async (taskId) => {
        try {
            await clearTaskNotifications('offer accepted', taskId);
            await fetchNotifications();
        } catch (error) {
            console.error('Error clearing accepted notifications:', error);
        }
    };

    const clearCancelledNotifications = async (taskId) => {
        try {
            await clearTaskNotifications('task cancelled', taskId);
            await fetchNotifications();
        } catch (error) {
            console.error('Error clearing cancelled notifications:', error);
        }
    };

    const clearCompletedNotifications = async (taskId) => {
        try {
            await clearTaskNotifications('task completed', taskId);
            await fetchNotifications();
        } catch (error) {
            console.error('Error clearing completed notifications:', error);
        }
    };
      
      const handleViewChat = (chatId, taskId) => {
        navigation.navigate('ChatDetailScreen', { chatId });
      };
      

      const handleViewTask = (taskId) => {
        if (selectedTab === 'Requester') {
            clearOfferNotifications(taskId);
            clearCancelledNotifications(taskId); // Clear 'task cancelled' notifications for Requester
        } else if (selectedTab === 'Tasker') {
            clearAcceptedNotifications(taskId);
            clearCancelledNotifications(taskId); // Clear 'task cancelled' notifications for Tasker
            clearCompletedNotifications(taskId);
        }
    };

    const handleLeaveReview = async (taskId) => {
        setTasks((prevTasks) =>
            prevTasks.map((task) =>
                task.id === taskId ? { ...task, hasSubmittedReview: true } : task
            )
        )
    };

    const handleViewProfile = (userId) => {
        navigation.navigate('ProfileScreen', { userId });
    };

    // Function to handle accepting an offer
    const handleAcceptOffer = async (offerId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'You must be logged in to accept an offer.');
                return;
            }

            const response = await api.post(
                `/offers/accept/${offerId}`, // Include offerId here
                {}, // No need to send offerId in the body
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 200) {
                Alert.alert('Offer Accepted', 'You have accepted the offer.');
                await fetchTasks(); // Refresh tasks to reflect changes
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

    // Function to handle deleting a task
    const handleDeleteTask = async (taskId) => {

        Alert.alert(
            'Confirm Deletion',
            'Are you sure you want to delete this task? All associated chats will also be deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('userToken');
                            if (!token) {
                                Alert.alert('Error', 'You must be logged in to delete tasks.');
                                return;
                            }

                            // API call to delete the task
                            const response = await api.delete(`/tasks/${taskId}`, {
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });

                            if (response.status === 200) {
                                Alert.alert('Deleted', 'Your task has been deleted successfully.');
                                await fetchTasks(); // Refresh the tasks list
                            }
                        } catch (error) {
                            console.error('Error deleting task:', error.response ? error.response.data : error.message);
                            Alert.alert('Error', 'Failed to delete the task.');
                        }
                    } 
                },
            ]
        );
    };

    const refreshTasks = async () => {
        setIsLoading(true);
        try {
          await fetchNotifications();
          await fetchTasks();
        } catch (error) {
          console.error('Error refreshing tasks:', error);
        } finally {
          setIsLoading(false);
        }
      };    

    // Render Tasker Tab
    const renderTaskerTab = () => {
        const taskerTasks = tasks.filter(task => 
            task.taskerAcceptedId === user?.id ||  // Task was accepted by this user (tasker)
            (task.offers && user && task.offers.some(offer => offer.taskerId === user.id && offer.status === 'cancelled'))
        );
          

        return (
            <FlatList
                data={taskerTasks}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                    const { acceptedNotifications } = getTaskNotificationCount(item.id); // Destructure here
                
                    return (
                        <DetailedTaskPost 
                            task={item}
                            loggedInUserId={user?.id} 
                            hasSubmittedReview={item.hasSubmittedReview}
                            onMarkComplete={() => handleCompleteTask(item.chatId)}
                            notificationCount={acceptedNotifications} // Total notifications
                            onCancelTask={() => handleCancelTask(item.chatId)}
                            onViewChat={() => handleViewChat(item.chatId, item.id)} // Pass taskId
                            onViewTask={() => handleViewTask(item.id)} // For clearing offer notifications
                            onLeaveReview={() => handleLeaveReview(item.id)}
                            onViewProfile={(userId) => handleViewProfile(userId)}
                            onAcceptOffer={handleAcceptOffer}
                            onDeleteTask={() => handleDeleteTask(item.id)}
                            onImageError={refreshTasks} 
                        />
                    );
                }}
                ListEmptyComponent={<Text style={styles.emptyText}>No tasks as a tasker.</Text>}
            />
        );
    };

    // Render Requester Tab
    const renderRequesterTab = () => {
        const requesterTasks = tasks.filter(task => task.userId === user?.id); // Tasks where user is requester

        return (
            <FlatList
                data={requesterTasks}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                    const { offerNotifications } = getTaskNotificationCount(item.id); // Destructure here
                
                    return (
                        <DetailedTaskPost 
                            task={item}
                            loggedInUserId={user?.id} 
                            hasSubmittedReview={item.hasSubmittedReview}
                            onMarkComplete={() => handleCompleteTask(item.chatId)}
                            notificationCount={offerNotifications} // Total notifications
                            onCancelTask={() => handleCancelTask(item.chatId)}
                            onViewChat={() => handleViewChat(item.chatId, item.id)} // Pass taskId
                            onViewTask={() => handleViewTask(item.id)} // For clearing offer notifications
                            onLeaveReview={() => handleLeaveReview(item.id)}
                            onViewProfile={(userId) => handleViewProfile(userId)}
                            onAcceptOffer={handleAcceptOffer}
                            onDeleteTask={() => handleDeleteTask(item.id)}
                            onImageError={refreshTasks}
                        />
                    );
                }}
                ListEmptyComponent={<Text style={styles.emptyText}>No tasks as a requester.</Text>}
            />
        );
    };

    // Conditional rendering based on selected tab
    const renderTabContent = () => {
        if (isLoading) {
            return <ActivityIndicator size="large" color="#1DA1F2" />;
        }

        return selectedTab === 'Requester' ? renderRequesterTab() : renderTaskerTab();
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Tabs for switching between perspectives */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, selectedTab === 'Requester' && styles.activeTab]}
                    onPress={() => setSelectedTab('Requester')}
                >
                    <Text style={styles.tabText}>Requester</Text>
                    {requesterNotificationCount > 0 && (  // Use badgeCounts instead of activityNotificationCount
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationBadgeText}>{requesterNotificationCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, selectedTab === 'Tasker' && styles.activeTab]}
                    onPress={() => {
                        setSelectedTab('Tasker');
                        tasks.forEach(task => {
                            const { acceptedNotifications, cancelledNotifications, completedNotifications } = getTaskNotificationCount(task.id);
                            if (acceptedNotifications > 0 || cancelledNotifications > 0 || completedNotifications > 0) {
                                clearAcceptedNotifications(task.id); // Clear the tasker notifications for each task
                                clearCancelledNotifications(task.id);
                                clearCompletedNotifications(task.id);
                            }
                        });
                    }

                    }
                >
                    <Text style={styles.tabText}>Tasker</Text>
                    {taskerNotificationCount > 0 && (  // Display badge for Tasker tab
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationBadgeText}>{taskerNotificationCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Render tab content based on selectedTab */}
            <View style={styles.contentContainer}>
                {renderTabContent()}
            </View>
            <Modal
                    visible={isReasonModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setIsReasonModalVisible(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setIsReasonModalVisible(false)}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Cancel Task</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Enter reason for cancellation (optional)"
                                    value={cancellationReason}
                                    onChangeText={setCancellationReason}
                                    multiline
                                    placeholderTextColor="#aaa"
                                />
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity style={styles.modalButton} onPress={() => setIsReasonModalVisible(false)}>
                                        <Text style={styles.modalButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modalButton} onPress={() => confirmCancelTask(taskToCancel)}>
                                        <Text style={styles.modalButtonText}>Confirm</Text>
                                    </TouchableOpacity>

                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
        </SafeAreaView>
    );
};

export default ActivityScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 15,
        backgroundColor: '#ffffff',
        borderBottomColor: '#ddd',
        borderBottomWidth: 1,
    },
    tabButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginHorizontal: 10,
        borderRadius: 20,
        backgroundColor: '#e1e1e1',
    },
    activeTab: {
        backgroundColor: '#3717ce',
    },
    tabText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    notificationBadge: {
        position: 'absolute',
        top: -5,
        right: -10,
        backgroundColor: 'red',
        borderRadius: 10, // Half of width/height for a circle
        minWidth: 20,     // Ensure the badge is a square
        minHeight: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadgeText: {
        color: 'white',
        fontSize: 12,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    emptyText: {
        color: '#6c757d',
        textAlign: 'center',
        marginTop: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    modalInput: {
        height: 100,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        textAlignVertical: 'top',
        marginBottom: 20,
        color: '#333',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        backgroundColor: '#3717ce',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        alignItems: 'center',
        flex: 0.48,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    
});