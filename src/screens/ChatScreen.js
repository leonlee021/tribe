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

const ChatScreen = () => {
  const { user } = useContext(UserContext);
  const [chats, setChats] = useState([]);
  const [selectedTab, setSelectedTab] = useState('requester'); // 'requester' or 'tasker'
  const navigation = useNavigation();
  const route = useRoute();
  const { 
    badgeCounts, 
    notifications, 
    fetchNotifications,
    unreadChats,
    markChatAsRead,
    resetBadgeCounts // We won't use this directly anymore
  } = useContext(NotificationContext);

  // ChatScreen.js
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        return;
      }

      try {
        const response = await api.get('/chats');
        if (response?.data) {
          setChats(response.data);
        }
      } catch (error) {
        if (!error.response || (error.response.status !== 401 && error.response.status !== 403)) {
          console.error('Error fetching chats:', error);
        }
      }
    };

    fetchData();
    console.log('Current notifications:', notifications);
    console.log('Current badge counts:', badgeCounts);

    const unsubscribe = navigation.addListener('focus', () => {
      fetchNotifications();
    });

    return unsubscribe;
  }, [user, navigation, badgeCounts, fetchNotifications]);

  // Function to get notification count for a chat
  const getChatNotificationCount = (chatId) => {
    return notifications.filter(n => 
      n.type === 'chat' && 
      n.chatId === chatId && 
      !n.isRead
    ).length;
  };

  // Function to get total unread notifications for "Requester" and "Tasker" tabs
  const getTotalTabNotifications = () => {
    const requesterChats = chats.filter(chat => chat.requesterId === user?.id);
    const taskerChats = chats.filter(chat => chat.taskerId === user?.id);

    const requesterNotificationCount = notifications.filter(n =>
      n.type === 'chat' &&
      !n.isRead &&
      requesterChats.some(chat => chat.id === n.chatId)
    ).length;

    const taskerNotificationCount = notifications.filter(n =>
      n.type === 'chat' &&
      !n.isRead &&
      taskerChats.some(chat => chat.id === n.chatId)
    ).length;

    return { requesterNotificationCount, taskerNotificationCount };
  };

  const { requesterNotificationCount, taskerNotificationCount } = getTotalTabNotifications();

  const handleTabPress = (tab) => {
    setSelectedTab(tab);
    // Don't clear notifications here - let them clear when individual chats are opened
  };

  // Function to handle chat press
  const handleChatPress = async (chat) => {
    // Clear notifications for this specific chat
    await clearTaskNotifications('new message', chat.taskId);
    await fetchNotifications(); // This will update the notifications list
    
    navigation.navigate('ChatDetailScreen', {
      chatId: chat.id,
      chatWith: selectedTab === 'requester' ? chat.taskerName : chat.requesterName,
    });
  };
  

  const renderChatItem = ({ item }) => {
    const unreadCount = getChatNotificationCount(item.id);
    let chatText = selectedTab === 'requester' ? item.taskerName : item.requesterName;

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
              <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
            </View>
          )}
          <Icon name="chevron-right" size={20} color="#ccc" />
        </View>
      </TouchableOpacity>
    );
  };
  // Ensure user is defined before filtering
  const requesterChats = user ? chats.filter(chat => chat.requesterId === user.id) : [];
  const taskerChats = user ? chats.filter(chat => chat.taskerId === user.id) : [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Tabs */}
      {/* Tabs for switching between perspectives */}
      <View style={styles.tabContainer}>
          <TouchableOpacity
              style={[styles.tabButton, selectedTab === 'requester' && styles.activeTab]}
              onPress={() => handleTabPress('requester')}
          >
              <Text style={styles.tabText}>Requester</Text>
              {requesterNotificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{requesterNotificationCount}</Text>
                  </View>
              )}
          </TouchableOpacity>
          <TouchableOpacity
              style={[styles.tabButton, selectedTab === 'tasker' && styles.activeTab]}
              onPress={() => handleTabPress('tasker')}
          >
              <Text style={styles.tabText}>Tasker</Text>
              {taskerNotificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{taskerNotificationCount}</Text>
                  </View>
              )}
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
            {selectedTab === 'requester' ? 'No chats yet as requester!' : 'No chats yets as tasker!'}
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
      borderRadius: 10,
      minWidth: 20,
      minHeight: 20,
      justifyContent: 'center',
      alignItems: 'center',
  },
  notificationBadgeText: {
      color: 'white',
      fontSize: 12,
  },
});

export default ChatScreen;
