import React, { useState, useEffect } from 'react';
import 'react-native-get-random-values'; 
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginPromptModal from '../components/LoginModal';
import api from '../services/api'; // API import for task posting
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import MapComponent from '../components/MapComponent';
import { GOOGLE_PLACES_API_KEY } from "@env";

const CustomScreen = () => {
    const [taskName, setTaskName] = useState('');
    const [postContent, setPostContent] = useState('');
    const [location, setLocation] = useState('');
    const [price, setPrice] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [images, setImages] = useState([]); // State to store selected images
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigation = useNavigation();
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [currentLocationCoords, setCurrentLocationCoords] = useState(null);
    const [locationText, setLocationText] = useState('');
    const [showLocationSearch, setShowLocationSearch] = useState(false);

    useEffect(() => {
        const checkAuthStatus = async () => {
            const token = await AsyncStorage.getItem('userToken');
            setIsLoggedIn(!!token);
        };
        checkAuthStatus();
    }, []);

    const LocationSearchComponent = () => (
        <View style={styles.locationSearchOverlay}>
            <View style={styles.locationSearchHeader}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => setShowLocationSearch(false)}
                >
                    <Icon name="arrow-left" size={20} color="#000" />
                </TouchableOpacity>
                <Text style={styles.locationSearchTitle}>Search Location</Text>
            </View>
            <GooglePlacesAutocomplete
                placeholder="Search for location"
                onPress={(data, details = null) => {
                    const locationString = data.description;
                    setLocationText(locationString);
                    setLocation(locationString);
                    if (details) {
                        setSelectedLocation({
                            latitude: details.geometry.location.lat,
                            longitude: details.geometry.location.lng,
                            address: locationString
                        });
                    }
                    setShowLocationSearch(false);
                }}
                query={{
                    key: GOOGLE_PLACES_API_KEY,
                    language: 'en',
                }}
                styles={{
                    container: styles.googlePlacesContainer,
                    textInput: styles.googlePlacesInput,
                    listView: styles.googlePlacesList,
                    row: styles.googlePlacesRow,
                }}
                fetchDetails={true}
                enablePoweredByContainer={false}
                textInputProps={{
                    placeholderTextColor: '#999',
                }}
            />
        </View>
    );

    // Add this function to get current location
    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Please allow location access to use this feature.');
                return;
            }

            const position = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = position.coords;

            // Get address from coordinates
            const [address] = await Location.reverseGeocodeAsync({
                latitude,
                longitude
            });

            const locationString = `${address.street || ''} ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`;
            setLocationText(locationString.trim());
            setLocation(locationString.trim());
            setSelectedLocation({
                latitude,
                longitude,
                address: locationString
            });
            setCurrentLocationCoords({ latitude, longitude });
        } catch (error) {
            Alert.alert('Error', 'Could not fetch current location.');
            console.error(error);
        }
    };

    const handleNextStep = () => {
        if (currentStep === 1 && (!taskName || !postContent)) {
            Alert.alert('Error', 'Please enter both the title and details.');
        } else if (currentStep === 2 && (!price || parseFloat(price) < 5)) {
            Alert.alert('Error', 'Price must be at least $5.');
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePreviousStep = () => {
        setCurrentStep(currentStep - 1);
    };

    const handleExitProcess = () => {
        Alert.alert(
            'Exit Task Creation',
            'Are you sure you want to exit the task creation process?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Exit', style: 'destructive', onPress: () => navigation.navigate('HomeScreen') },
            ]
        );
    };

    // Function to handle image picking
    const pickImage = async () => {
        if (images.length >= 5) {
            Alert.alert('Limit Reached', 'You can only upload up to 5 images.');
            return;
        }
    
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need camera roll permissions to make this work!');
            return;
        }
    
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false, // Change to 'false' if multiple selection isn't supported
            aspect: [4, 3],
            quality: 0.7,
        });
    
        if (!result.canceled) {
            const compressedImage = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [{ resize: { width: 800 } }], // Resize to width 800px (maintains aspect ratio)
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );
            setImages([...images, compressedImage.uri]);
        }
    };
    

    // Function to handle removing an image
    const removeImage = (uri) => {
        setImages(images.filter((image) => image !== uri));
    };

    const handlePost = async () => {
        if (!isLoggedIn) {
            setIsModalVisible(true);
            return;
        }
    
        const token = await AsyncStorage.getItem('userToken');
        try {
            // Create a new FormData object
            const formData = new FormData();
    
            // Append text fields
            formData.append('taskName', taskName);
            formData.append('postContent', postContent);
            formData.append('location', location);
            formData.append('price', price);
    
            // Append images to FormData
            images.forEach((imageUri, index) => {
                const filename = imageUri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;
    
                formData.append('taskPhotos', {
                    uri: imageUri,
                    name: filename,
                    type,
                });
            });
    
            // Send the formData
            const response = await api.post('/tasks', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });
    
            if (response.status === 201) {
                Alert.alert('Success', 'Task has been posted!');
                resetForm();
                navigation.navigate('HomeScreen');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to post the task.');
            console.error(error);
        }
    };
    

    const resetForm = () => {
        setTaskName('');
        setPostContent('');
        setLocation('');
        setPrice('');
        setImages([]);
        setCurrentStep(1);
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <View style={styles.formContainer}>
                        <Text style={styles.label}>Task Title</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter task title"
                            placeholderTextColor="#999"
                            value={taskName}
                            onChangeText={setTaskName}
                            maxLength={50}
                        />
                        <Text style={styles.label}>Details</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            placeholder="Include task details"
                            placeholderTextColor="#999"
                            value={postContent}
                            onChangeText={setPostContent}
                            multiline={true}
                            maxLength={150}
                        />
                        <Text style={styles.charCount}>{150 - postContent.length}/150 characters remaining</Text>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.formContainer}>
                        <Text style={styles.label}>Price</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter price (minimum $5)"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={price}
                            onChangeText={setPrice}
                        />
                    </View>
                );
            case 3:
                return (
                    <View style={styles.formContainer}>
                        <Text style={styles.label}>Location</Text>
                        <TouchableOpacity 
                            style={styles.currentLocationButton} 
                            onPress={getCurrentLocation}
                        >
                            <Icon name="location-arrow" size={16} color="#fff" />
                            <Text style={styles.currentLocationButtonText}>
                                Use Current Location
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.locationInput}
                            onPress={() => setShowLocationSearch(true)}
                        >
                            <Text style={locationText ? styles.locationText : styles.locationPlaceholder}>
                                {locationText || "Search for location"}
                            </Text>
                            <Icon name="search" size={16} color="#999" />
                        </TouchableOpacity>

                        {selectedLocation && (
                            <View style={styles.mapContainer}>
                                <MapComponent
                                    location={selectedLocation}
                                    height={200}
                                    title="Task Location"
                                />
                            </View>
                        )}
                    </View>
                );
            case 4:
                return (
                    <View style={styles.formContainer}>
                        <Text style={styles.label}>Upload Photos</Text>
                        <TouchableOpacity style={styles.addButton} onPress={pickImage}>
                            <Icon name="camera" size={24} color="#fff" />
                            <Text style={styles.addButtonText}>Add Photo</Text>
                        </TouchableOpacity>
                        <View style={styles.imagePreviewContainer}>
                            {images.map((uri, index) => (
                                <View key={index} style={styles.imageContainer}>
                                    <Image source={{ uri }} style={styles.previewImage} />
                                    <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(uri)}>
                                        <Icon name="times-circle" size={24} color="#ff4d4d" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                        <Text style={styles.charCount}>{5 - images.length} photo(s) remaining</Text>
                    </View>
                );
            default:
                return null;
        }
    };

    const renderPageTracker = () => {
        return (
            <View style={styles.pageTrackerContainer}>
                {[1, 2, 3, 4].map((step) => (
                    <View
                        key={step}
                        style={[
                            styles.circle,
                            currentStep >= step && styles.filledCircle,
                        ]}
                    />
                ))}
            </View>
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.select({ ios: 60, android: 80 })}
            >
                {!showLocationSearch ? (
                    <ScrollView contentContainerStyle={styles.contentContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Request A Task</Text>
                        </View>

                        {/* Page Tracker */}
                        {renderPageTracker()}

                        {/* Step Content */}
                        {renderStepContent()}

                        {/* Navigation Buttons */}
                        <View style={styles.navigationContainer}>
                            {currentStep > 1 && (
                                <TouchableOpacity style={styles.backButton} onPress={handlePreviousStep}>
                                    <Icon name="arrow-left" size={18} color="#3717ce" />
                                    <Text style={styles.navigationButtonTextBack}>Back</Text>
                                </TouchableOpacity>
                            )}
                            {currentStep < 4 && (
                                <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
                                    <Text style={styles.navigationButtonText}>Next</Text>
                                    <Icon name="arrow-right" size={18} color="#fff" style={styles.arrowSpacing} />
                                </TouchableOpacity>
                            )}
                            {currentStep === 4 && (
                                <TouchableOpacity style={styles.submitButton} onPress={handlePost}>
                                    <Text style={styles.submitButtonText}>Submit Task</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Exit Button */}
                        <TouchableOpacity style={styles.exitButton} onPress={handleExitProcess}>
                            <Icon name="close" size={18} color="#fff" />
                            <Text style={styles.exitButtonText}>Exit</Text>
                        </TouchableOpacity>

                        {/* Modal for login */}
                        <LoginPromptModal
                            visible={isModalVisible}
                            onClose={() => setIsModalVisible(false)}
                            onLoginSuccess={handlePost}
                        />
                    </ScrollView>
                ) : (
                    <LocationSearchComponent />
                )}
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
};

export default CustomScreen;

const styles = StyleSheet.create({
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f7f9fc',
    },
    header: {
        marginBottom: 20,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#3717ce',
    },
    pageTrackerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
    },
    circle: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#ddd',
        marginHorizontal: 5,
    },
    filledCircle: {
        backgroundColor: '#3717ce',
    },
    formContainer: {
        marginBottom: 30,
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    label: {
        fontSize: 18,
        color: '#333',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    textInput: {
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 15,
        fontSize: 16,
        borderColor: '#ddd',
        borderWidth: 1,
        marginBottom: 20,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        textAlign: 'right',
        fontSize: 12,
        color: '#999',
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
    },
    nextButton: {
        backgroundColor: '#3717ce',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 25,
        shadowColor: '#3717ce',
        shadowOpacity: 0.5,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
    },
    arrowSpacing: {
        marginLeft: 10,
    },
    navigationButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    backButton: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 25,
        borderColor: '#3717ce',
        borderWidth: 1,
    },
    navigationButtonTextBack: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3717ce',
        marginLeft: 10,
    },
    submitButton: {
        backgroundColor: '#3717ce',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 25,
        shadowColor: '#3717ce',
        shadowOpacity: 0.5,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    exitButton: {
        marginTop: 20,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 25,
        backgroundColor: '#ff4d4d',
        borderRadius: 25,
        shadowColor: '#ff4d4d',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
    },
    exitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 10,
    },
    smallButtonText: {
        fontSize: 14,
        color: '#007AFF', // iOS blue, use '#2196F3' for Android material blue
        fontWeight: '500', // Medium weight for better readability
        paddingVertical: 4,
        letterSpacing: 0.25, // Subtle letter spacing for better legibility
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3717ce',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 25,
        marginBottom: 20,
    },
    addButtonText: {
        fontSize: 16,
        color: '#fff',
        marginLeft: 10,
    },
    imagePreviewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    imageContainer: {
        position: 'relative',
        marginRight: 10,
        marginBottom: 10,
    },
    previewImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    currentLocationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3717ce',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    currentLocationButtonText: {
        color: '#fff',
        marginLeft: 8,
        fontSize: 14,
    },
    locationSearchOverlay: {
        flex: 1,
        backgroundColor: 'white',
    },
    locationSearchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    locationSearchTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 16,
    },
    googlePlacesContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    googlePlacesInput: {
        height: 44,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        fontSize: 16,
        backgroundColor: 'white',
    },
    googlePlacesList: {
        backgroundColor: 'white',
    },
    googlePlacesRow: {
        padding: 13,
        height: 'auto',
        minHeight: 44,
    },
    locationInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        backgroundColor: 'white',
        marginBottom: 10,
    },
    locationText: {
        fontSize: 16,
        color: '#000',
        flex: 1,
    },
    locationPlaceholder: {
        fontSize: 16,
        color: '#999',
        flex: 1,
    },
    mapContainer: {
        marginTop: 10,
        borderRadius: 8,
        overflow: 'hidden',
    },
});