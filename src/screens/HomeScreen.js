import React, { useState, useEffect, useContext } from 'react';
import { 
    StyleSheet, Text, View, SafeAreaView, FlatList, 
    TouchableOpacity, Alert, RefreshControl, ActivityIndicator, StatusBar , Image
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import TaskPost from '../components/TaskPost';
import { UserContext } from '../contexts/UserContext';
import { fetchNotifications, clearTaskNotifications } from '../services/notificationService';
import { NotificationContext } from '../contexts/NotificationContext';
import { useUI } from '../providers/UIProvider';

const HomeScreen = () => {
    const [tasks, setTasks] = useState([]);
    const [refreshing, setRefreshing] = useState(false); 
    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(true);
    //const { badgeCounts, setBadgeCounts, notifications, fetchNotifications } = useContext(NotificationContext); 
    const { user, fetchUserProfile } = useContext(UserContext);
    const { useNewComponents } = useUI();

    useEffect(() => {
        const initialize = async () => {
            const token = await AsyncStorage.getItem('userToken');
            await fetchTasks();
            setIsLoading(false);
        };
        initialize();
    }, []);
    
    const fetchTasks = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const response = await api.get('/tasks', { headers });
            setTasks(response.data);
        } catch (error) {
            console.error('Error fetching tasks:', JSON.stringify(error, null, 2));
        }
    };

    // Function to handle submitting an offer
    const handleSubmitOffer = async (taskId, offerPrice, offerMessage) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'You must be logged in to submit an offer.');
                return;
            }

            const response = await api.post(
                '/offers',
                { taskId, offerPrice, offerMessage },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 201) {
                Alert.alert('Offer Submitted', 'Your offer has been submitted successfully.');
                await fetchTasks(); // Refresh tasks to include the new offer
            } else {
                Alert.alert('Error', 'Failed to submit the offer.');
            }
        } catch (error) {
            console.error('Error submitting offer:', error.response || error.message);
            Alert.alert('Error', 'Failed to submit the offer.');
        }
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

    // Function to handle deleting a task
    const handleDeleteTask = async (taskId) => {
        console.log('handleDeleteTask called with taskId:', taskId); // Debugging log

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

                            console.log('Delete Task Response:', response.data);

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

    // Function to handle viewing a user's profile
    const handleViewProfile = (userId) => {
        navigation.navigate('ProfileScreen', { userId });
    };

    // Function to handle refreshing the task list
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchTasks(); // Re-fetch tasks on refresh
        setRefreshing(false);
    };

    const handleRequestTask = () => {
        navigation.navigate('CustomScreen');
    };

    const renderTasks = () => {
        if (isLoading) {
            return <ActivityIndicator size="large" color="#3717ce" />;
        }

        return (
            <FlatList
                data={tasks.filter(task => task.status !== 'completed' && !task.deleted)} 
                renderItem={({ item }) => 
                    <TaskPost 
                        task={item}
                        onAcceptOffer={handleAcceptOffer}
                        onDelete={handleDeleteTask}
                        loggedInUserId={user?.id}
                        onSubmitOffer={handleSubmitOffer}
                        onViewProfile={handleViewProfile}
                    />
                }
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.postsContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#3717ce']}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No tasks currently available.</Text>
                    </View>
                }
            />
        );
    };

    if (useNewComponents) {
        return <v2HomeScreen />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f4f6fc" />

            {/* Mutually Text at the Top Left */}
            <View style={styles.headerContainer}>
                <Image
                    source={require('../mutually logo reversed.jpg')}  // Path to your image
                    style={styles.mImage}
                />
                {/* <Text style={styles.mutuallyText}>utually</Text> */}
            </View>

            {/* Big "Request a Task" Button */}
            <TouchableOpacity style={styles.requestTaskButton} onPress={handleRequestTask}>
                <Text style={styles.requestTaskButtonText}>Request a Task</Text>
            </TouchableOpacity>

            {/* Task Feed */}
            <View style={styles.taskFeedContainer}>
                {renderTasks()}
            </View>
        </SafeAreaView>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f6fc',
        backgroundColor: '#fff',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    mImage: {
        width: 90,  // Adjust the width as necessary for your image
        height: 90, // Adjust the height as necessary for your image
        resizeMode: 'contain',  // Maintain aspect ratio of the image
      },
    mutuallyText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#3717ce',
        letterSpacing: 1.5,
    },
    requestTaskButton: {
        backgroundColor: '#3717ce',
        paddingVertical: 26,
        paddingHorizontal: 80,
        borderRadius: 35,
        alignSelf: 'center',
        marginTop: 15,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 5 },
        shadowColor: '#3717ce',    // Changed to match button color for a glowing effect
        shadowOffset: { 
            width: 0, 
            height: 5             // Increased offset
        },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
        transform: [              // Added transform to lift the button
            { translateY: -5 }    // Lifts the button up slightly
        ],
    },
    requestTaskButtonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    taskFeedContainer: {
        flex: 1,
        marginTop: 30,
        paddingHorizontal: 20,
    },
    postsContainer: {
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        color: '#777',
        fontWeight: 'bold',
    },
});
