// src/v2/screens/CustomScreen.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import api from '../../services/api';

const CustomScreen = () => {
    const [taskDescription, setTaskDescription] = useState('');
    const [analyzedData, setAnalyzedData] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const navigation = useNavigation();

    const analyzeTask = async () => {
        if (!taskDescription.trim()) {
            Alert.alert('Error', 'Please describe your task');
            return;
        }

        setIsAnalyzing(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            // Call your NLP endpoint
            const response = await api.post('/analyze-task', {
                description: taskDescription
            }, { headers });

            setAnalyzedData(response.data);
        } catch (error) {
            console.error('Error analyzing task:', error);
            Alert.alert('Error', 'Failed to analyze task description');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handlePost = async () => {
        if (!analyzedData) {
            Alert.alert('Error', 'Please analyze the task first');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'You must be logged in to post a task');
                return;
            }

            const response = await api.post('/tasks', {
                description: taskDescription,
                ...analyzedData,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.status === 201) {
                Alert.alert('Success', 'Task has been posted!');
                navigation.navigate('Home');
            }
        } catch (error) {
            console.error('Error posting task:', error);
            Alert.alert('Error', 'Failed to post the task');
        }
    };

    const renderAnalysis = () => {
        if (!analyzedData) return null;

        return (
            <View style={styles.analysisContainer}>
                <Text style={styles.sectionTitle}>Task Details</Text>
                
                {analyzedData.locations?.map((location, index) => (
                    <View key={index} style={styles.detailItem}>
                        <Icon name="map-marker" size={20} color="#3717ce" />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>
                                {location.type === 'pickup' ? 'Pickup Location' : 'Dropoff Location'}
                            </Text>
                            <Text style={styles.detailText}>{location.address}</Text>
                        </View>
                    </View>
                ))}

                {analyzedData.deadline && (
                    <View style={styles.detailItem}>
                        <Icon name="clock-o" size={20} color="#3717ce" />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Deadline</Text>
                            <Text style={styles.detailText}>{analyzedData.deadline}</Text>
                        </View>
                    </View>
                )}

                {analyzedData.estimatedPrice && (
                    <View style={styles.detailItem}>
                        <Icon name="dollar" size={20} color="#3717ce" />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Estimated Price</Text>
                            <Text style={styles.detailText}>{analyzedData.estimatedPrice}</Text>
                        </View>
                    </View>
                )}

                <TouchableOpacity style={styles.submitButton} onPress={handlePost}>
                    <Text style={styles.submitButtonText}>Post Task</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-left" size={20} color="#3717ce" />
                    </TouchableOpacity>

                    <Text style={styles.title}>Describe your task</Text>
                    
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Example: Pick up a package from 123 Main St and deliver it to 456 Oak Ave before 5pm today"
                            placeholderTextColor="#999"
                            multiline
                            value={taskDescription}
                            onChangeText={setTaskDescription}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.analyzeButton, isAnalyzing && styles.disabledButton]}
                        onPress={analyzeTask}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.analyzeButtonText}>Analyze Task</Text>
                        )}
                    </TouchableOpacity>

                    {renderAnalysis()}
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
        padding: 20,
    },
    backButton: {
        padding: 10,
        marginLeft: -10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#3717ce',
        marginVertical: 20,
    },
    inputContainer: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
    },
    textArea: {
        height: 120,
        fontSize: 16,
        color: '#333',
    },
    analyzeButton: {
        backgroundColor: '#3717ce',
        padding: 15,
        borderRadius: 25,
        alignItems: 'center',
        marginBottom: 20,
    },
    disabledButton: {
        opacity: 0.7,
    },
    analyzeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    analysisContainer: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 20,
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    detailContent: {
        marginLeft: 10,
        flex: 1,
    },
    detailLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    detailText: {
        fontSize: 16,
        color: '#666',
    },
    submitButton: {
        backgroundColor: '#3717ce',
        padding: 15,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 20,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CustomScreen;