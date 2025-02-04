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
import Ionicons from 'react-native-vector-icons/Ionicons';

const ChatDetailScreen = ({ chatId, onBack }) => {
    const route = useRoute();
    const navigation = useNavigation();
    const { fromTaskPost, chatWithId } = route.params || {};
    const { user } = useContext(UserContext); // Consume UserContext to get the authenticated user
    const [chatWithName, setChatWithName] = useState('');
    const [chatWithUserIdLocal, setChatWithUserIdLocal] = useState(chatWithId || null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [chatDetails, setChatDetails] = useState(null);
    const [isRequester, setIsRequester] = useState(false);
    const [isReasonModalVisible, setIsReasonModalVisible] = useState(false);
    const flatListRef = useRef(null);
    const activeChatId = chatId || route.params?.chatId;


    const { fetchUserProfile } = useContext(UserContext);

    const handleBack = () => {
        if (onBack) {
          onBack();
        } else {
          navigation.goBack();
        }
      };

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

    const renderMessage = ({ item }) => {
        const isUserMessage = item.senderId === user?.id;
        return (
            <View style={[
                styles.messageContainer,
                isUserMessage ? styles.userMessage : styles.otherMessage,
            ]}>
                <View style={[
                    styles.messageBubble,
                    isUserMessage ? styles.userBubble : styles.otherBubble
                ]}>
                    <Text style={[
                        styles.messageText,
                        isUserMessage ? styles.userMessageText : styles.otherMessageText
                    ]}>
                        {item.content}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>{chatWithName}</Text>
                    </View>
                </View>
    
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderMessage}
                    style={styles.flatList}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                />
    
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Type your message..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholderTextColor="#999"
                        multiline
                        maxHeight={100}
                    />
                    <TouchableOpacity 
                        style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                        onPress={handleSendMessage}
                        disabled={!newMessage.trim()}
                    >
                        <Icon name="send" size={20} color={newMessage.trim() ? "#fff" : "#ccc"} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
            <Modal
                visible={isReasonModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsReasonModalVisible(false)}
            />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
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
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#3717ce',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
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
    chatContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        justifyContent: 'space-between',
    },
    messagesList: {
        padding: 12,
        flexGrow: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    messageContainer: {
        marginVertical: 4,
        maxWidth: '80%',
    },
    userMessage: {
        alignSelf: 'flex-end',
    },
    otherMessage: {
        alignSelf: 'flex-start',
    },
    senderName: {
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 3,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    userMessageText: {
        color: '#fff',
    },
    otherMessageText: {
        color: '#000',
    },
    messageBubble: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 8,
        maxWidth: '100%',
    },
    userBubble: {
        backgroundColor: '#3717ce',
    },
    otherBubble: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
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
        padding: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        maxHeight: 100,
        fontSize: 16,
    },
    sendButton: {
        backgroundColor: '#3717ce',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#f5f5f5',
    },

});

export default ChatDetailScreen;
