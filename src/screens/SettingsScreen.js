import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StripeProvider, useStripe, CardField } from '@stripe/stripe-react-native';
import api from '../services/api';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { UserContext } from '../contexts/UserContext';

const SettingsScreen = () => {
    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(false);
    const stripe = useStripe();  // Initialize Stripe
    const [cardDetails, setCardDetails] = useState(null);

    const { setUser } = useContext(UserContext);

    const handleAddCard = async () => {
        if (!cardDetails?.complete) {
            Alert.alert('Error', 'Please enter complete card details');
            return;
        }

        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            
            // Call your backend to create a setup intent
            const { clientSecret } = await api.post('/payment/setup-intent', {}, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Confirm the Setup Intent with the card details
            const { error, setupIntent } = await stripe.confirmSetupIntent(clientSecret, {
                paymentMethodType: 'Card',
                paymentMethodData: {
                    billingDetails: {
                        email: 'user@example.com',  // Add any billing details you want to pass
                    },
                },
            });

            if (error) {
                console.error('Error confirming setup intent:', error);
                Alert.alert('Error', 'Failed to add your card.');
            } else if (setupIntent.status === 'succeeded') {
                Alert.alert('Success', 'Card added successfully!');
            } else {
                console.error('Setup intent was not successful:', setupIntent);
                Alert.alert('Error', 'Unable to add card.');
            }
        } catch (error) {
            console.error('Error adding card:', error);
            Alert.alert('Error', 'Unable to add card.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            'Confirm Deletion',
            'Are you sure you want to delete your account? This action is irreversible.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            const token = await AsyncStorage.getItem('userToken');
                            await api.delete('/users/delete-account', {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            Alert.alert('Success', 'Your account has been deleted.');
                            await AsyncStorage.removeItem('userToken');
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'LoginScreen' }],
                            });
                        } catch (error) {
                            console.error('Error deleting account:', error);
                            Alert.alert('Error', 'Failed to delete account.');
                        } finally {
                            setIsLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleLogout = async () => {
        Alert.alert(
            'Confirm Logout',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    onPress: async () => {
                        try {
                            await auth().signOut(); // Sign out using React Native Firebase Auth
    
                            // Remove tokens or any user-specific data from AsyncStorage
                            await AsyncStorage.removeItem('userToken');
    
                            // Update UserContext to null (guest user)
                            setUser(null);
    
                            // Navigate back to the ProfileScreen
                            navigation.navigate('ProfileScreen'); // Adjust if your screen name is different
    
                            Alert.alert('Logged Out', 'You have been logged out successfully.');
                        } catch (error) {
                            console.error('Error logging out:', error);
                            Alert.alert('Error', 'Failed to log out. Please try again.');
                        }
                    },
                },
            ]
        );
    };
    
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView style={styles.settingsList}>
                {/* Add Credit Card */}
                <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('AddCardScreen')}>
                    <View style={styles.settingItemContent}>
                        <Icon name="card-outline" size={24} color="#007ACC" style={styles.settingIcon} />
                        <Text style={styles.settingText}>Manage Payment</Text>
                    </View>
                    <Icon name="chevron-forward" size={24} color="#ccc" />
                </TouchableOpacity>

                {/* Delete Account */}
                <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
                    <View style={styles.settingItemContent}>
                        <Icon name="trash-outline" size={24} color="#FF4136" style={styles.settingIcon} />
                        <Text style={styles.settingText}>Delete Account</Text>
                    </View>
                    <Icon name="chevron-forward" size={24} color="#ccc" />
                </TouchableOpacity>

                {/* Log Out Button */}
                <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
                    <View style={styles.settingItemContent}>
                        <Icon name="log-out-outline" size={24} color="#FF4136" style={styles.settingIcon} />
                        <Text style={styles.settingText}>Log Out</Text>
                    </View>
                    <Icon name="chevron-forward" size={24} color="#ccc" />
                </TouchableOpacity>
            </ScrollView>

            {isLoading && <ActivityIndicator size="large" color="#1DA1F2" />}
        </SafeAreaView>
    );
};

export default SettingsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
    },
    backButton: {
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    settingsList: {
        backgroundColor: '#fff',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
        justifyContent: 'space-between',
    },
    settingItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingIcon: {
        marginRight: 15,
    },
    settingText: {
        fontSize: 16,
        color: '#333',
    },
    button: {
        backgroundColor: '#1DA1F2',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    deleteButton: {
        backgroundColor: '#FF4136',
    },
});
