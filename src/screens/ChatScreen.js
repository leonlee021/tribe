import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView, FlatList 
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import Icon from 'react-native-vector-icons/FontAwesome';
import { UserContext } from '../contexts/UserContext';
import { fetchNotifications, clearTaskNotifications } from '../services/notificationService';
import { NotificationContext } from '../contexts/NotificationContext';
import Badge from '../components/Badge.js';

const ChatScreen = () => {
  const { user } = useContext(UserContext);
  const { badgeCounts, setBadgeCounts, notifications, fetchNotifications } = useContext(NotificationContext); 
  const [chats, setChats] = useState([]);
  const [isGuest, setIsGuest] = useState(false);
  const [selectedTab, setSelectedTab] = useState('requester'); // 'requester' or 'tasker'
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsGuest(true);
        return;
      }
  
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          setIsGuest(true);
          return;
        }
  
        // Fetch chats
        const response = await api.get('/chats', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setChats(response.data);
  
        // No need to fetch notifications here
      } catch (error) {
        console.error('Error fetching data:', error);
        if (error.response && error.response.status === 401) {
          Alert.alert('Unauthorized', 'Please log in to view your chats.');
          setIsGuest(true);
        }
      }
    };
  
    fetchData();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchNotifications(); // Refresh notifications from context
    });
  
    return unsubscribe;
  
  }, [user, navigation, fetchNotifications]);
  

  // Function to get notification count for a chat
  const getChatNotificationCount = (taskId) => {
    return notifications.filter(
      (n) => n.taskId === taskId && n.message === 'new message' && !n.isRead
    ).length;
  };

  // Function to get total unread notifications for "Requester" and "Tasker" tabs
  const getTotalTabNotifications = () => {
    const requesterChats = chats.filter(chat => chat.requesterId === user.id);
    const taskerChats = chats.filter(chat => chat.taskerId === user.id);

    const requesterNotificationCount = requesterChats.reduce((total, chat) => {
      return total + getChatNotificationCount(chat.taskId);
    }, 0);

    const taskerNotificationCount = taskerChats.reduce((total, chat) => {
      return total + getChatNotificationCount(chat.taskId);
    }, 0);

    return { requesterNotificationCount, taskerNotificationCount };
  };

  const { requesterNotificationCount, taskerNotificationCount } = getTotalTabNotifications();


  // Function to handle chat press
  const handleChatPress = async (chat) => {
    const taskId = chat.taskId;
  
    // Clear notifications for this chat
    await clearTaskNotifications('new message', taskId);
    await fetchNotifications();
    // Navigate to ChatDetailScreen
    navigation.navigate('ChatDetailScreen', {
      chatId: chat.id,
      chatWith: selectedTab === 'requester' ? chat.taskerName : chat.requesterName,
    });
  };
  

  const renderChatItem = ({ item }) => {
    let chatText = '';
    let chatWith = '';

    if (selectedTab === 'requester') {
      chatText = `${item.taskerName}`;
      chatWith = item.taskerName;
    } else {
      chatText = `${item.requesterName}`;
      chatWith = item.requesterName;
    }

    const unreadCount = getChatNotificationCount(item.taskId);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
      >
        <View style={styles.chatItemContent}>
          <View style={styles.chatTextContainer}>
            <Text style={styles.chatText}>{chatText}</Text>
            <Text style={styles.chatSubText}>{item.taskName}</Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount}
              </Text>
            </View>
          )}
          <Icon name="chevron-right" size={20} color="#ccc" />
        </View>
      </TouchableOpacity>
    );
  };

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="comments" size={100} color="#ccc" />
          <Text style={styles.emptyText}>Please log in to view your chats.</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('LoginScreen')}>
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Ensure user is defined before filtering
  const requesterChats = user ? chats.filter(chat => chat.requesterId === user.id) : [];
  const taskerChats = user ? chats.filter(chat => chat.taskerId === user.id) : [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'requester' && styles.activeTabButton,
          ]}
          onPress={() => setSelectedTab('requester')}
        >
          <Text style={styles.tabButtonText}>As Requester</Text>
          {requesterNotificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{requesterNotificationCount}</Text>
            </View>
          )}
          <Icon
            name="user"
            size={20}
            color={selectedTab === 'requester' ? '#3717ce' : '#333'}
            style={styles.tabIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            selectedTab === 'tasker' && styles.activeTabButton,
          ]}
          onPress={() => setSelectedTab('tasker')}
        >
          <Text style={styles.tabButtonText}>As Tasker</Text>
          {taskerNotificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{taskerNotificationCount}</Text>
            </View>
          )}
          <Icon
            name="briefcase"
            size={20}
            color={selectedTab === 'tasker' ? '#3717ce' : '#333'}
            style={styles.tabIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <FlatList
        data={selectedTab === 'requester' ? requesterChats : taskerChats}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderChatItem}
        contentContainerStyle={styles.chatList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {selectedTab === 'requester' ? 'No chats as requester.' : 'No chats as tasker.'}
          </Text>
        }
      />
    </SafeAreaView>
  );
};


// Styles remain unchanged or adjusted as needed
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 7,
  },
  tabIcon: {
    marginRight: 8,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#3717ce',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chatList: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f5f7fa',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#777',
  },
  chatItem: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#3717ce',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  chatText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  chatSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  notificationBadge: {
    backgroundColor: 'red',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatTextContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#3717ce',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatScreen;
