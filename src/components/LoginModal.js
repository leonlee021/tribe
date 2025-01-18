// src/components/LoginModal.js

import React, { useState, useEffect, useContext } from 'react';
import { 
    View, 
    Text, 
    Modal, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    Alert, 
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth'; // Updated import
import { 
    GoogleAuthProvider, 
} from '@react-native-firebase/auth'; // Updated import
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import api from '../services/api'; // Ensure this is correctly configured
import { UserContext } from '../contexts/UserContext';

WebBrowser.maybeCompleteAuthSession();

const LoginModal = ({ visible, onClose, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // For confirming password
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSignUp, setIsSignUp] = useState(false); // Track if we're in login or sign-up mode
    const [loading, setLoading] = useState(false); // For loading indicators

    // Google OAuth session configuration
    const [request, response, promptAsync] = Google.useAuthRequest({
        expoClientId: '314894501328-5sclq8a6seol3ad7b26fim8t57e3gct3.apps.googleusercontent.com',
        iosClientId: '314894501328-jhkm1r4651qgle9p271vdu8t57e3gct3.apps.googleusercontent.com',
        scopes: ['openid', 'profile', 'email'],
        responseType: 'id_token', // Request both access token and ID token
        redirectUri: makeRedirectUri({
            scheme: 'mutually', // Replace with your app's scheme
            useProxy: true,
        }),
    });

    const { setUser } = useContext(UserContext);

    useEffect(() => {
        if (response) {
            console.log('OAuth response:', response);
            if (response.type === 'success') {
                const { id_token } = response.params;
                if (id_token) {
                    handleGoogleSignIn(id_token);
                } else {
                    console.error('ID token not found in response.params');
                    setErrorMessage('Google Sign-In failed. Please try again.');
                }
            } else if (response.type === 'error') {
                console.error('Authentication error:', response.error);
                setErrorMessage('Authentication error. Please try again.');
            }
        }
    }, [response]);

    useEffect(() => {
        const unsubscribe = auth().onIdTokenChanged(async (user) => {
            if (user) {
                const token = await user.getIdToken();
                await AsyncStorage.setItem('userToken', token);
            } else {
                await AsyncStorage.removeItem('userToken');
            }
        });
      
        return () => unsubscribe();
    }, []);

    const handleGoogleSignIn = async (idToken) => {
        try {
            setLoading(true);
            const credential = GoogleAuthProvider.credential(idToken);
            const userCredential = await auth().signInWithCredential(credential);
            const firebaseUser = userCredential.user;
            const firebaseIdToken = await firebaseUser.getIdToken();
            await AsyncStorage.setItem('userToken', firebaseIdToken);
            await createUserProfile(firebaseIdToken);
            setLoading(false);
            onLoginSuccess();
        } catch (error) {
            console.error('Error during sign-in with credential:', error);
            setErrorMessage('Sign-in failed. Please try again.');
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!validateEmail(email)) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }
    
        try {
            setLoading(true);
            
            // Simple sign out first
            try {
                await auth().signOut();
            } catch (e) {
                // Ignore sign out errors
            }
    
            // Simple login attempt
            const userCredential = await auth().signInWithEmailAndPassword(
                email.trim(),
                password
            );
    
            const user = userCredential.user;
            
            if (!user.emailVerified) {
                Alert.alert('Email not verified', 'Please verify your email before logging in.');
                setLoading(false);
                return;
            }
    
            const idToken = await user.getIdToken();
            await AsyncStorage.setItem('userToken', idToken);
    
            const userProfileResponse = await api.get('/users/profile', {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
            });
    
            setUser(userProfileResponse.data);
            onLoginSuccess();
    
        } catch (error) {
            console.error('Login error:', error.code, error.message);
            Alert.alert(
                'Login Error',
                'Please check your email and password and try again.'
            );
        } finally {
            setLoading(false);
        }
    };
    
    const handleSignUp = async () => {
        // Input validation
        if (firstName.trim() === '' || lastName.trim() === '') {
            setErrorMessage('First and Last names are required.');
            return;
        }
        if (!validateEmail(email)) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }
        if (password.length < 7 || password.length > 42) {
            setErrorMessage('Password must be between 7 and 42 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        try {
            setLoading(true);
            const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
            const user = userCredential.user;

            // Send email verification
            await user.sendEmailVerification();

            Alert.alert('Verification Email Sent', 'Please check your email to verify your account.');

            // Get Firebase ID token
            const idToken = await user.getIdToken();

            // Store token in AsyncStorage
            await AsyncStorage.setItem('userToken', idToken);

            // Create or update user profile in backend
            await createUserProfile(idToken);

            onLoginSuccess(); // Notify parent that sign-up was successful
            setLoading(false);
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                setErrorMessage('Email already in use. Please log in instead.');
            } else {
                console.error('Sign-Up error:', error.message);
                setErrorMessage('Sign-Up failed. Please try again.');
            }
            setLoading(false);
        }
    };

    const createUserProfile = async (idToken) => {
        try {
            const response = await api.post(
                '/users',
                { firstName: firstName.trim(), lastName: lastName.trim() }, // Include additional user info if needed
                {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                }
            );

            if (response.status === 201) {
                console.log('User profile created or updated successfully');
            } else {
                console.warn('User profile creation response:', response.data);
            }
        } catch (error) {
            console.error('Error creating user profile:', error.response?.data || error.message);
            setErrorMessage('Failed to create user profile.');
        }
    };

    const handlePasswordReset = async () => {
        if (!email) {
            setErrorMessage('Please enter your email to reset password.');
            return;
        }
        if (!validateEmail(email)) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }
        try {
            setLoading(true);
            await auth().sendPasswordResetEmail(email.trim());
            Alert.alert('Password Reset', 'Password reset email sent. Please check your inbox.');
            setLoading(false);
        } catch (error) {
            console.error('Password Reset error:', error.message);
            setErrorMessage('Failed to send password reset email.');
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setErrorMessage('');
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    };

    const handleAuthError = (error) => {
        switch (error.code) {
            case 'auth/user-not-found':
                setErrorMessage('No user found with this email.');
                break;
            case 'auth/wrong-password':
                setErrorMessage('Incorrect password. Please try again.');
                break;
            case 'auth/invalid-email':
                setErrorMessage('Invalid email address.');
                break;
            case 'auth/user-disabled':
                setErrorMessage('This user has been disabled.');
                break;
            default:
                setErrorMessage('Authentication failed. Please try again.');
        }
    };

    const validateEmail = (email) => {
        const re = /\S+@\S+\.\S+/;
        return re.test(email);
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.centeredView}
            >
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>
                            {isSignUp ? 'Create an Account' : 'Log In'}
                        </Text>
                        {isSignUp && (
                            <>
                                <TextInput
                                    style={styles.input}
                                    placeholder="First Name"
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    placeholderTextColor="#999"
                                    autoCapitalize="words"
                                    returnKeyType="next"
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Last Name"
                                    value={lastName}
                                    onChangeText={setLastName}
                                    placeholderTextColor="#999"
                                    autoCapitalize="words"
                                    returnKeyType="next"
                                />
                            </>
                        )}
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor="#999"
                            returnKeyType="next"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            placeholderTextColor="#999"
                            returnKeyType={isSignUp ? "next" : "done"}
                        />
                        {isSignUp && (
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                placeholderTextColor="#999"
                                returnKeyType="done"
                            />
                        )}
                        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                        {loading ? (
                            <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={[styles.button, isSignUp ? styles.buttonSignUp : styles.buttonLogin]}
                                    onPress={isSignUp ? handleSignUp : handleLogin}
                                >
                                    <Text style={styles.buttonText}>
                                        {isSignUp ? 'Sign Up' : 'Login'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.buttonSecondary}
                                    onPress={onClose}
                                >
                                    <Text style={styles.buttonSecondaryText}>Cancel</Text>
                                </TouchableOpacity>
                                {!isSignUp && (
                                    <>
                                        <TouchableOpacity onPress={handlePasswordReset}>
                                            <Text style={styles.linkText}>Forgot Password?</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={toggleMode}>
                                            <Text style={styles.linkText}>
                                                Don’t have an account? Sign up
                                            </Text>
                                        </TouchableOpacity>
                                        
                                        {/* Google Sign-In Button */}
                                        {/* <TouchableOpacity
                                            style={styles.googleButton}
                                            disabled={!request}
                                            onPress={() => {
                                                promptAsync();
                                            }}
                                        >
                                            <Text style={styles.googleButtonText}>Sign in with Google</Text>
                                        </TouchableOpacity> */}
                                    </>
                                )}
                                {isSignUp && (
                                    <TouchableOpacity onPress={toggleMode}>
                                        <Text style={styles.linkText}>
                                            Already have an account? Log in
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default LoginModal;


const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    scrollViewContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalView: {
        margin: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        width: '90%',
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        marginVertical: 8,
        borderRadius: 8,
        color: '#333',
        fontSize: 16,
    },
    errorText: {
        color: '#FF3B30',
        marginTop: 8,
        textAlign: 'center',
    },
    button: {
        width: '100%',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonLogin: {
        backgroundColor: '#2196F3',
    },
    buttonSignUp: {
        backgroundColor: '#34C759',
    },
    buttonSecondary: {
        width: '100%',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    buttonSecondaryText: {
        color: '#333',
        fontSize: 16,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    linkText: {
        color: '#2196F3',
        marginTop: 15,
        fontSize: 14,
    },
    googleButton: {
        width: '100%',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: '#DB4437',
    },
    googleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    loader: {
        marginTop: 20,
    },
});