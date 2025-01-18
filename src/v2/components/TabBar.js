import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native'; 
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { NotificationContext } from '../../contexts/NotificationContext';
import  Badge  from '../../components/Badge.js';

const data = [
    {
        id: "1",
        title: "Home",
        screen: "HomeScreen",
        icon: "home-outline",
    },
    {
        id: "2",
        title: "Activity",
        screen: "ActivityScreen",
        icon: "pulse-outline",
    },
    // {
    //     id: "5",
    //     title: "Map",
    //     screen: "MapScreen",
    //     icon: "person-outline",
    // },
    // {
    //     id: "3",
    //     title: "Chat",
    //     screen: "ChatScreen",
    //     icon: "chatbubble-outline",
    // },
    {
        id: "4",
        title: "Profile",
        screen: "ProfileScreen",
        icon: "person-outline",
    },
];

const TabBar = ({ currentScreen }) => {
    const navigation = useNavigation();
    const { badgeCounts, fetchNotifications} = useContext(NotificationContext);


    return (
        <View style={styles.tabBarContainer}>
            <FlatList
                data={data}
                keyExtractor={(item) => item.id}
                horizontal
                renderItem={({ item }) => {
                    // Dynamically set the notification count for each screen
                    let notificationCount = 0;
                    if (item.screen === 'ActivityScreen') {
                        notificationCount = badgeCounts.activity;
                      } else if (item.screen === 'ChatScreen') {
                        notificationCount = badgeCounts.chat;
                    }

                    return (
                        <TouchableOpacity 
                            onPress={() => navigation.navigate(item.screen)} 
                            style={[
                                styles.navStyles, 
                                currentScreen === item.screen && styles.activeNavStyles
                            ]}
                        >
                            <View style={styles.iconContainer}>
                                <Icon name={item.icon} size={24} color={'black'} />
                                {notificationCount > 0 && (
                                    <Badge count={notificationCount} />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
                style={styles.flatlistStyle}
                contentContainerStyle={styles.contentContainerStyle}
            />
        </View>
    );
};

export default TabBar;

const styles = StyleSheet.create({
    tabBarContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        height: 60,
        backgroundColor: '#fff', // Set your desired background color
        borderTopWidth: 1,
        borderColor: '#ccc', // Set your desired border color
        justifyContent: 'center',
    },
    flatlistStyle: {
        flex: 1,
    },
    contentContainerStyle: {
        justifyContent: "space-around",
        alignItems: "center",
        flex: 1,
    },
    navStyles: {
        flexDirection: "row",
        padding: 10,
        backgroundColor: "#fff",
        margin: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    navTextStyles: {
        fontSize: 15,
        fontWeight: "400",
    },
      iconContainer: {
    position: 'relative', // Allows absolute positioning of the badge
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    right: -6, // Adjust as needed
    top: -3,  // Adjust as needed
    backgroundColor: 'red',
    borderRadius: 8, // Half of width and height to make it circular
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});