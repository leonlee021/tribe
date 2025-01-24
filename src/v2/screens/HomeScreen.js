import React, { useState, useContext, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
    Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from '../../contexts/UserContext';
import api from '../../services/api';
import Icon from 'react-native-vector-icons/Ionicons';
import authService from '../../services/authService';

const { width } = Dimensions.get('window');
const MAX_WIDTH = Math.min(width * 0.9, 400);

const HomeScreen = () => {
    const [description, setDescription] = useState('');
    // const [analyzedData, setAnalyzedData] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useContext(UserContext);
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        const pulse = Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.02,
                duration: 2000,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
        ]);

        Animated.loop(pulse).start();
    }, []);

    const handlePost = async () => {

        if (!description.trim()) {
            Alert.alert('Error', 'Please describe your task');
            return;
        }

        setIsLoading(true);

        try {
            console.log('Attempting to create task...');
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'You must be logged in to post a task');
                return;
            }

            console.log('Making request to:', '/v2/tasks');
            console.log('With data:', { description: description.trim() });
            console.log('With token:', token)

            const response = await authService.fetchWithSilentAuth(api => 
                api.post('/v2/tasks', {
                    description: description.trim()
                })
            );

            console.log('Task creation response:', response.data);

            if (response?.data) {
                Alert.alert(
                    'Success', 
                    'Task has been posted!',
                    [{ text: 'OK', onPress: () => setDescription('') }]
                );
            } else {
                console.log('Response without data:', response);
                Alert.alert('Error', 'Failed to post task - no data returned');
            }
        } catch (error) {
            console.error('Error posting task:', error);
            Alert.alert('Error', 'Failed to post the task');
        } finally {
            setIsLoading(false);
        }

    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1A202C" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.contentContainer}>
                        <View style={styles.headerSection}>
                        <Text style={styles.preTitle}>
                            Hi {user ? user.firstName : ''},
                            </Text>
                            <Text style={styles.title}>What task would you like to request?</Text>
                        </View>
                        <View style={styles.inputWrapper}>
                            <Animated.View style={[
                                styles.inputContainer,
                                // { transform: [{ scale: !analyzedData ? pulseAnim : 1 }] }
                            ]}>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Describe your task with all relevant details (ie. location, time, etc.)"
                                    placeholderTextColor="#999"
                                    multiline
                                    value={description}
                                    onChangeText={setDescription}
                                    textAlignVertical="top"
                                />
                            </Animated.View>

                            <TouchableOpacity 
                                style={[
                                    styles.postButton,
                                    (!description.trim() || isLoading) 
                                ]}
                                onPress={handlePost}
                                disabled={!description.trim() || isLoading}
                            >
                                {isAnalyzing ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Text style={styles.analyzeButtonText}>Find Me A Tasker</Text>
                                        <Icon name="analytics" size={20} color="#fff" style={styles.buttonIcon} />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    headerSection: {
        width: MAX_WIDTH,
        marginVertical: 40,
    },
    preTitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 8,
        fontWeight: '600',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#3717ce',
        lineHeight: 40,
    },
    inputWrapper: {
        width: MAX_WIDTH,
    },
    inputContainer: {
        backgroundColor: '#f0f0f0', // Changed to gray
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0', // Slightly darker border
        shadowColor: '#3717ce',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    textArea: {
        minHeight: 120,
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },
    postButton: {
        backgroundColor: '#3717ce',
        padding: 18,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3717ce',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    disabledButton: {
        opacity: 0.7,
    },
    analyzeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    buttonIcon: {
        marginLeft: 8,
    },
    analysisContainer: {
        width: MAX_WIDTH,
        marginTop: 30,
        marginBottom: 40,
    },
    analysisHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    glowCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3182CE',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#63B3ED',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 10,
    },
    detailsList: {
        gap: 12,
    },
    detailCard: {
        flexDirection: 'row',
        backgroundColor: '#2D3748',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#4A5568',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailContent: {
        marginLeft: 12,
        flex: 1,
    },
    detailLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    detailText: {
        fontSize: 15,
        color: '#A0AEC0',
        lineHeight: 20,
    },
    submitButton: {
        backgroundColor: '#3182CE',
        padding: 18,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        shadowColor: '#63B3ED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    submitButtonIcon: {
        marginLeft: 8,
    },
});

export default HomeScreen;