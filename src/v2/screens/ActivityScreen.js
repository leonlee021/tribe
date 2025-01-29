import React, { useState, useEffect, useContext } from 'react';
import { 
    StyleSheet, Text, View, SafeAreaView, FlatList, 
    TouchableOpacity, Alert, ActivityIndicator, Modal, TouchableWithoutFeedback, TextInput
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { UserContext } from '../../contexts/UserContext';
import DetailedTaskPost from '../../components/DetailedTaskPost';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { NotificationContext } from '../../contexts/NotificationContext';
import { clearTaskNotifications } from '../../services/notificationService';
import authService from '../../services/authService';
import ProfileTaskPost from '../components/ProfileTaskPost';

const ActivityScreen = () => {
    const navigation = useNavigation();
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isReasonModalVisible, setIsReasonModalVisible] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [taskToCancel, setTaskToCancel] = useState(null); 
    const { notifications, fetchNotifications } = useContext(NotificationContext);
    const { user } = useContext(UserContext);

    // Fetch user notifications when the screen loads
    useEffect(() => {
        const fetchData = async () => {
            try {
                await fetchNotifications();
                await fetchTasks(); 
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Add this near your other useEffect hooks
    useFocusEffect(
        React.useCallback(() => {
            const refreshData = async () => {
                try {
                    await fetchTasks();
                } catch (error) {
                    console.error('Error refreshing tasks:', error);
                }
            };
            refreshData();
        }, [])
    );

    // Function to get the notification count for a specific task
    const getTaskNotificationCount = (taskId) => {
        return {
            offerNotifications: notifications.filter(n => n.taskId === taskId && n.message === 'received offer').length,
            acceptedNotifications: notifications.filter(n => n.taskId === taskId && n.message === 'offer accepted').length,
            cancelledNotifications: notifications.filter(n => n.taskId === taskId && n.message === 'task cancelled').length,
            completedNotifications: notifications.filter(n => n.taskId === taskId && n.message === 'task completed').length
        };
    };

    const fetchHasSubmittedReview = async (taskId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await api.get(`/tasks/${taskId}/review-status`, { headers });
            return response.data.hasSubmittedReview;
        } catch (error) {
            return false;
        }
    };

    const fetchTasks = async () => {
        const response = await authService.fetchWithSilentAuth(api => api.get('/v2/tasks'));
        if (response?.data) {
            const tasksWithReviewStatus = await Promise.all(
                response.data
                    .filter(task => task.status === 'open') // Filter tasks with status 'open'
                    .map(async task => {
                        const { hasSubmittedReview } = task.status === 'completed' 
                            ? { hasSubmittedReview: await fetchHasSubmittedReview(task.id) }
                            : { hasSubmittedReview: false };
                        
                        const counts = getTaskNotificationCount(task.id);
                        const hasNotification = Object.values(counts).some(count => count > 0);
                        
                        return { ...task, hasSubmittedReview, hasNotification };
                    })
            );
            setTasks(tasksWithReviewStatus.sort((a, b) => b.hasNotification - a.hasNotification));
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
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (task.userId === user?.id) {
            clearOfferNotifications(taskId);
            clearCancelledNotifications(taskId);
        } else {
            clearAcceptedNotifications(taskId);
            clearCancelledNotifications(taskId);
            clearCompletedNotifications(taskId);
        }
    };

    const handleLeaveReview = async (taskId) => {
        try {
            // Update the local state immediately for better UX
            setTasks((prevTasks) =>
                prevTasks.map((task) =>
                    task.id === taskId ? { ...task, hasSubmittedReview: true } : task
                )
            );
            
            // Refresh the tasks to ensure we have the latest data
            await fetchTasks();
        } catch (error) {
            console.error('Error updating review status:', error);
        }
    };

    const handleViewProfile = (userId) => {
        navigation.navigate('ProfileScreen', { userId });
    };

    // Function to handle accepting an offer
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

    const handleSubmitOffer = async (taskId, offerPrice, offerMessage) => {
        try {
            // Input validation
            if (!taskId || !offerPrice || !offerMessage) {
                Alert.alert('Error', 'All fields are required');
                return;
            }
    
            // Ensure offerMessage is a string
            const messageStr = String(offerMessage);
            const price = Number(offerPrice);
    
            if (isNaN(price) || price <= 0) {
                Alert.alert('Error', 'Please enter a valid price');
                return;
            }
    
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'Not authenticated. Please log in again.');
                return;
            }
    
            const response = await api.post('/offers', {
                taskId,
                offerPrice: price,
                offerMessage: messageStr,
                isV2Task: true
            }, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 201) {
                await fetchTasks();
                Alert.alert('Success', 'Your offer has been submitted!');
            }
        } catch (error) {
            console.error('Error submitting offer:', {
                message: error.message,
                data: error.response?.data,
                status: error.response?.status
            });
            
            let errorMessage = 'Failed to submit offer.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            
            Alert.alert('Error', errorMessage);
        }
    };


    const renderItem = ({ item }) => {
        if (item.status !== 'open') return null; 
        const counts = getTaskNotificationCount(item.id);
        const isRequester = item.userId === user?.id;
        const notificationCount = isRequester 
            ? counts.offerNotifications + counts.cancelledNotifications
            : counts.acceptedNotifications + counts.cancelledNotifications + counts.completedNotifications;

        return (
            <ProfileTaskPost 
                task={item}
                loggedInUserId={user?.id}
                hasSubmittedReview={item.hasSubmittedReview}
                onMarkComplete={() => handleCompleteTask(item.chatId)}
                notificationCount={notificationCount}
                onCancelTask={() => handleCancelTask(item.chatId)}
                onViewChat={() => handleViewChat(item.chatId, item.id)}
                onViewTask={() => handleViewTask(item.id)}
                onLeaveReview={() => handleLeaveReview(item.id)}
                onViewProfile={handleViewProfile}
                onAcceptOffer={handleAcceptOffer}
                onDeleteTask={() => handleDeleteTask(item.id)}
                onImageError={fetchTasks}
                onSubmitOffer={handleSubmitOffer}
                isTaskOwner={isRequester}
                taskStatus={item.status}
            />
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1DA1F2" />
                </View>
            ) : (
                <FlatList
                    data={tasks}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No open tasks to display. Open tasks will show up here!</Text>
                    }
                    contentContainerStyle={styles.contentContainer}
                    style={styles.list} 
                />
            )}
            
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
        flexGrow: 1, 
        paddingHorizontal: 20,
        paddingVertical: 10,
      },
    emptyText: {
        color: '#777',
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
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
    list: {
        flex: 1, // Ensure FlatList takes full available space
      }, 
});