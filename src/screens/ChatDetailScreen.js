import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
    KeyboardAvoidingView, Platform, SafeAreaView, Alert, Keyboard, TouchableWithoutFeedback, 
    Modal
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import Icon from 'react-native-vector-icons/FontAwesome';
import { UserContext } from '../contexts/UserContext';

const ChatDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { chatId, chatWith, chatWithId } = route.params || {};
    const { user } = useContext(UserContext); // Consume UserContext to get the authenticated user

    const [chatWithName, setChatWithName] = useState('');
    const [chatWithUserIdLocal, setChatWithUserIdLocal] = useState(chatWithId || null);

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [chatDetails, setChatDetails] = useState(null);
    const [isRequester, setIsRequester] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false); // To show review form when task is marked complete
    const [review, setReview] = useState('');  // For the review text input
    const [rating, setRating] = useState(0);   // For the rating out of 5 stars
    const [hasSubmittedReview, setHasSubmittedReview] = useState(false);
    const [isReasonModalVisible, setIsReasonModalVisible] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [offers, setOffers] = useState([]); // To manage offers
    const flatListRef = useRef(null);


    const { fetchUserProfile } = useContext(UserContext);

    useEffect(() => {
        if (!chatId) {
            Alert.alert('Error', 'Chat ID is missing.');
            navigation.goBack();
            return;
        }

        const fetchChatDetails = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                if (!token) throw new Error('User token not found');

                const response = await api.get(`/chats/${chatId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setChatDetails(response.data);

                const isRequesterUser = response.data.requesterId === user?.id;
                setIsRequester(isRequesterUser);

                const chatWithUserIdDerived = isRequesterUser ? response.data.taskerId : response.data.requesterId;
                setChatWithUserIdLocal(chatWithUserIdDerived);

                // Set chatWithName based on the role
                if (isRequesterUser) {
                    setChatWithName(response.data.taskerName || 'Tasker');
                } else {
                    setChatWithName(response.data.requesterName || 'Requester');
                }

                setHasSubmittedReview(response.data.hasSubmittedReview);
            } catch (error) {
                console.error('Error fetching chat details:', error);
                Alert.alert('Error', 'Failed to fetch chat details.');
                navigation.goBack();
            }
        };

        const fetchMessages = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                if (!token) throw new Error('User token not found');
        
                const response = await api.get(`/chats/${chatId}/messages`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
        
                // Sort messages by creation date in ascending order (oldest to newest)
                const sortedMessages = response.data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                setMessages(sortedMessages);
        
                // Scroll to bottom after loading messages
                setTimeout(() => {
                    if (flatListRef.current) {
                        flatListRef.current.scrollToEnd({ animated: false });
                    }
                }, 0);
            } catch (error) {
                console.error('Error fetching messages:', error);
                Alert.alert('Error', 'Failed to fetch messages.');
            }
        };
        
        
        const initialize = async () => {
            if (user && user.id) {
                await fetchChatDetails();
                await fetchMessages();
            } else {
                Alert.alert('Error', 'User not authenticated.');
                navigation.goBack();
            }
        };

        initialize();
    }, [chatId, user, navigation]);

    const handleSendMessage = async () => {
        if (newMessage.trim()) {
            try {
                const token = await AsyncStorage.getItem('userToken');
                if (!token) throw new Error('User token not found');
    
                const response = await api.post(`/chats/${chatId}/messages`, { content: newMessage }, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
    
                // Append the new message without sorting
                const updatedMessages = [...messages, response.data];
                setMessages(updatedMessages);
                setNewMessage('');
    
                // Scroll to bottom after adding new message
                setTimeout(() => {
                    if (flatListRef.current) {
                        flatListRef.current.scrollToEnd({ animated: true });
                    }
                }, 0);
            } catch (error) {
                if (error.response?.status === 401) {
                    console.error('Unauthorized, please log in again:', error);
                    Alert.alert('Error', 'Unauthorized. Please log in again.');
                } else {
                    console.error('Error sending message:', error);
                    Alert.alert('Error', 'Failed to send message.');
                }
            }
        }
    };


    const handleCompleteTask = async () => {
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
                setChatDetails(prevDetails => ({ ...prevDetails, status: 'completed' }));
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

    const handleCancelTask = () => {
        setIsReasonModalVisible(true);
    };
    
    // Function to confirm and process the cancellation
    const confirmCancelTask = async () => {
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
                // Update local state to reflect the cancellation
                setChatDetails(prevDetails => ({
                    ...prevDetails,
                    status: 'offered',
                    taskerAcceptedId: null,
                }));
                // Refresh offers to make them available again
                // await fetchOffers();
                // Fetch updated user data to reflect canceledTasks
                await fetchUserProfile(); // Ensure this function is available from UserContext
                // Reset reason and close modal
                setCancellationReason('');
                setIsReasonModalVisible(false);
            }
        } catch (error) {
            if (error.response) {
                console.error('Error canceling task:', error.response.data);
                Alert.alert('Error', error.response.data.error || 'Failed to cancel the task.');
            } else {
                console.error('Error canceling task:', error.message);
                Alert.alert('Error', 'Failed to cancel the task.');
            }
        }
    };

    const submitReview = async () => {
        if (rating > 0 && review.trim()) {
            try {
                const token = await AsyncStorage.getItem('userToken');
                if (!token) throw new Error('User token not found');

                await api.post(
                    `/reviews`,
                    { chatId, rating, review },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );

                Alert.alert('Review Submitted', 'Your review has been successfully submitted.');
                setHasSubmittedReview(true); // Hide the review form after submission
            } catch (error) {
                console.error('Error submitting review:', error);
                Alert.alert('Error', 'Failed to submit review.');
            }
        } else {
            Alert.alert('Invalid Input', 'Please provide both a rating and a review.');
        }
    };

    const renderMessage = ({ item }) => {
        const isUserMessage = item.senderId === user?.id;
        return (
            <View
                style={[
                    styles.messageContainer,
                    isUserMessage ? styles.userMessage : styles.otherMessage,
                ]}
            >
                <Text style={styles.senderName}>
                    {isUserMessage ? 'You' : `${item.sender.firstName} ${item.sender.lastName}`}
                </Text>
                <Text style={styles.messageText}>{item.content}</Text>
            </View>
        );
    };

    const handleViewProfile = () => {
        if (chatWithUserIdLocal) {
            navigation.navigate('ProfileScreen', { userId: chatWithUserIdLocal });
        } else {
            Alert.alert('Error', 'Unable to locate user profile.');
        }
    };

    return (

            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    {/* Back Button */}
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>

                    {/* Header Text */}
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>{chatWithName}</Text>
                        <Text style={styles.headerSubTitle}>{chatDetails?.taskName || 'N/A'}</Text>
                    </View>

                    {/* View Profile Button */}
                    <TouchableOpacity style={styles.viewProfileButton} onPress={handleViewProfile}>
                        <Text style={styles.viewProfileButtonText}>View Profile</Text>
                    </TouchableOpacity>
                </View>

                {chatDetails && chatDetails.status === 'active' && (
                    <>
                        {isRequester ? (
                            <View style={styles.taskActionContainer}>
                                <Text style={styles.actionText}>The task is currently active.</Text>
                                <TouchableOpacity style={styles.completeButton} onPress={handleCompleteTask}>
                                    <Text style={styles.buttonText}>Mark Task as Completed</Text>
                                </TouchableOpacity>
                                {/* Add the Cancel Task button for the requester */}
                                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTask}>
                                    <Text style={styles.buttonText}>Cancel Task</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.taskActionContainer}>
                                <Text style={styles.actionText}>The task is currently active.</Text>
                                <Text style={styles.actionSubText}>{chatWithName} has not marked the task as completed yet.</Text>
                                {/* Add the Cancel Task button for the tasker */}
                                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTask}>
                                    <Text style={styles.buttonText}>Cancel Task</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
                {chatDetails && chatDetails.status === 'pending' && (
                <View style={styles.taskActionContainer}>
                    <Text style={styles.actionText}>This offer has been cancelled.</Text>
                </View>
                )}

                {chatDetails && chatDetails.status === 'completed' && !hasSubmittedReview &&  (
                    <View style={styles.reviewContainer}>
                        <Text style={styles.reviewTitle}>Leave a Review</Text>
                        <TextInput
                            style={styles.reviewInput}
                            placeholder="Write your review..."
                            value={review}
                            onChangeText={setReview}
                            multiline
                            placeholderTextColor="#aaa"
                        />
                        <View style={styles.ratingContainer}>
                            <Text style={styles.ratingLabel}>Rate out of 5: </Text>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                    <Text style={styles.star}>{star <= rating ? '★' : '☆'}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.submitButton} onPress={submitReview}>
                            <Text style={styles.submitButtonText}>Submit Review</Text>
                        </TouchableOpacity>
                    </View>
                )}

            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Adjust offset as needed
            >
                <View style={styles.content}>
                    {/* Messages List */}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.messagesList}
                        keyboardDismissMode="on-drag"
                        keyboardShouldPersistTaps="handled"
                        onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: false })}
                    />

                    {/* Message Input */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Type your message..."
                            value={newMessage}
                            onChangeText={setNewMessage}
                            placeholderTextColor="#aaa"
                        />
                        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                            <Text style={styles.sendButtonText}>Send</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </KeyboardAvoidingView>
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
                                    <TouchableOpacity style={styles.modalButton} onPress={confirmCancelTask}>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        marginBottom: 60,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    SafeAreaView: {
        flex: 1,
    },
    content: {
      flex: 1,  
    },
    flatList: {
        flex: 1,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
        alignItems: 'center',
        padding: 20,
        //backgroundColor: '#ffffff', // Changed to white for a cleaner look
        backgroundColor: '#3717ce',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3, // For Android shadow
    },
    
    
    headerTextContainer: {
        flex: 1,
        paddingRight: 10, // Maintains space between text and button
    },
    

    viewProfileButton: {
        backgroundColor: '#ffffff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        shadowColor: '#3717ce',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8, // For Android shadow
        transform: [{ scale: 1 }],
        transition: 'transform 0.2s',
    },
    
    viewProfileButtonPressed: {
        transform: [{ scale: 0.95 }],
    },
    
    viewProfileButtonText: {
        //color: '#ffffff',
        color: '#3717ce',
        fontSize: 14,
        fontWeight: 'bold',
    },
    

    headerTitle: {
        fontSize: 20,
        color: '#ffffff', // Darker shade for better contrast
        fontWeight: 'bold',
        marginBottom: 2,
    },
    
    headerSubTitle: {
        fontSize: 18,
        color: '#ffffff', // Softer color for subtitle
    },
    
    taskActionContainer: {
        padding: 20,
        backgroundColor: '#f9f9f9',
        borderBottomWidth: 1,
        borderColor: '#ddd',
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 10,
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
        padding: 10,
        marginRight: 10,
        borderRadius: 5,
    },
    declineButton: {
        backgroundColor: '#F44336',
        padding: 10,
        borderRadius: 5,
    },
    completeButton: {
        backgroundColor: '#2196F3',
        padding: 10,
        borderRadius: 5,
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: 'red', // Amber color to indicate caution
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
        marginTop: 10,
        alignItems: 'center',
    },

    messagesList: {
        paddingHorizontal: 10,
        paddingBottom: 10,

    },
    messageContainer: {
        marginBottom: 15,
        maxWidth: '75%',
        padding: 10,
        borderRadius: 10,
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#2196F3',
    },
    otherMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#e1e1e1',
    },
    senderName: {
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 3,
    },
    messageText: {
        fontSize: 16,
        color: '#000',
    },
    inputWrapper: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderColor: '#ccc',
        // flexShrink: 0,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        // marginBottom: 25, // Removed marginBottom
        borderTopWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#fff',
    },
    textInput: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        backgroundColor: '#f2f2f2',
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: '#3717ce',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    reviewContainer: {
        padding: 20,
        backgroundColor: '#f9f9f9',
        borderTopWidth: 1,
        borderColor: '#ddd',
        marginTop: 20,
    },
    reviewTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    reviewInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        height: 100,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    star: {
        fontSize: 24,
        marginHorizontal: 5,
        color: '#FFD700',
    },
    submitButton: {
        backgroundColor: '#4CAF50',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
// Add these styles within the existing StyleSheet.create block

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

export default ChatDetailScreen;
