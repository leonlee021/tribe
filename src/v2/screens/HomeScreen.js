import React, { useState, useContext, useEffect, forwardRef } from 'react';
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
import { FlatList } from 'react-native';
import api from '../../services/api';
import Icon from 'react-native-vector-icons/Octicons';
import authService from '../../services/authService';
// import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_PLACES_API_KEY } from "@env";
import 'react-native-get-random-values';
import { Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import MapComponent from '../components/MapComponent';

const { width } = Dimensions.get('window');
const MAX_WIDTH = Math.min(width * 0.9, 400);

const EnhancedMapView = forwardRef((props, ref) => (
    <MapView
      ref={ref}
      provider={PROVIDER_GOOGLE}
      {...props}
    />
  ));

const HomeScreen = ({ navigation }) => {
    const [description, setDescription] = useState('');
    const [locationText, setLocationText] = useState('');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const googlePlacesRef = React.useRef(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useContext(UserContext);
    const [pulseAnim] = useState(new Animated.Value(1));
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [region, setRegion] = useState({
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

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
    
    const getCurrentLocation = async () => {
        setIsLoadingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Please allow location access');
                return;
            }
    
            const position = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = position.coords;
    
            const [address] = await Location.reverseGeocodeAsync({
                latitude,
                longitude,
            });
    
            const locationString = `${address.street || ''} ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`;
            setLocationText(locationString.trim());
            setSelectedLocation(locationString.trim());
            
            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            setRegion(newRegion);
    
            if (googlePlacesRef.current) {
                googlePlacesRef.current.setAddressText(locationString);
            }
    
        } catch (error) {
            Alert.alert('Error', 'Could not fetch location');
            console.error(error);
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleLocationSelect = (data, details) => {
        const { geometry } = details;
        setSelectedLocation(data.description);
        
        const newRegion = {
            latitude: geometry.location.lat,
            longitude: geometry.location.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
        setRegion(newRegion);
    };

    const handlePost = async () => {
        if (!description.trim()) {
            Alert.alert('Error', 'Please describe your task');
            return;
        }
        if (!selectedLocation) {
            Alert.alert('Error', 'Please select a location');
            return;
        }
    
        setIsLoading(true);
    
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'You must be logged in to post a task');
                return;
            }
    
            const response = await authService.fetchWithSilentAuth(api => 
                api.post('/tasks', {
                    postContent: description.trim(),
                    location: selectedLocation,
                    coordinates: {
                        latitude: region.latitude,
                        longitude: region.longitude
                    }
                }, {
                    validateStatus: status => status < 500
                })
            );
    
            if (response.status === 201 && response.data) {
                Alert.alert(
                    'Success', 
                    'Task has been posted!',
                    [{ text: 'OK', onPress: () => {
                        setDescription('');
                        setSelectedLocation(null);
                    }}]
                );
            } else {
                Alert.alert('Error', response.data?.error || 'Failed to post task');
            }
        } catch (error) {
            console.error('Error posting task:', error);
            Alert.alert('Error', error.response?.data?.error || 'Network error while posting task');
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
                <FlatList 
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    data={[1]}
                    renderItem={() => (
                        <View style={styles.contentContainer}>
                        <View style={styles.headerSection}>
                            <Text style={styles.preTitle}>
                                Hi {user ? user.firstName : ''}
                            </Text>
                            <Text style={styles.title}>What task would you like to request?</Text>
                        </View>
                        <View style={styles.inputWrapper}>
                            <Animated.View style={[styles.inputContainer]}>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Describe your task with all relevant details (ie. time, etc.)"
                                    placeholderTextColor="#999"
                                    multiline
                                    value={description}
                                    onChangeText={setDescription}
                                    textAlignVertical="top"
                                />
                            </Animated.View>

                            <View style={styles.locationContainer}>
                                <TouchableOpacity 
                                    style={[styles.currentLocationButton, isLoadingLocation && styles.currentLocationButtonDisabled]} 
                                    onPress={getCurrentLocation}
                                    disabled={isLoadingLocation}
                                >
                                    {isLoadingLocation ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Icon name="location" size={16} color="#fff" />
                                            <Text style={styles.currentLocationButtonText}>Use Current Location</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <GooglePlacesAutocomplete
                                    ref={googlePlacesRef}
                                    placeholder="Search for location"
                                    onPress={(data, details = null) => {
                                        const locationString = data.description;
                                        setLocationText(locationString);
                                        setSelectedLocation(locationString);
                                        if (details) {
                                            setRegion({
                                                latitude: details.geometry.location.lat,
                                                longitude: details.geometry.location.lng,
                                                latitudeDelta: 0.0922,
                                                longitudeDelta: 0.0421,
                                            });
                                        }
                                    }}
                                    query={{
                                        key: GOOGLE_PLACES_API_KEY,
                                        language: 'en',
                                    }}
                                    styles={{
                                        container: styles.autocompleteContainer,
                                        textInput: styles.locationInput,
                                        listView: styles.locationList,
                                    }}
                                    fetchDetails={true}
                                    enablePoweredByContainer={false}
                                />

                                {selectedLocation && (
                                    <View style={styles.mapContainer}>
                                        <MapComponent
                                            location={{
                                                latitude: region.latitude,
                                                longitude: region.longitude
                                            }}
                                            height={200}
                                            title="Selected Location"
                                        />
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity 
                                style={[
                                    styles.postButton,
                                    (!description.trim() || isLoading) 
                                    // && styles.disabledButton
                                ]}
                                onPress={handlePost}
                                disabled={!description.trim() || isLoading}
                            >
                                {isAnalyzing ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Text style={styles.analyzeButtonText}>Post Task</Text>
                                        <Icon name="upload" size={20} color="#fff" style={styles.buttonIcon} />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                >
                </FlatList>
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
    viewTasksButton: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        borderWidth: 2,
        borderColor: '#3717ce',
    },
    viewTasksButtonText: {
        color: '#3717ce',
        fontSize: 18,
        fontWeight: '600',
    },
    locationContainer: {
        marginBottom: 20,
    },
    autocompleteContainer: {
        flex: 0,
        width: MAX_WIDTH,
    },
    locationInput: {
        height: 50,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        fontSize: 16,
    },
    locationList: {
        borderRadius: 16,
        backgroundColor: '#fff',
        marginTop: 5,
    },
    mapContainer: {
        width: MAX_WIDTH,
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    currentLocationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3717ce',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    currentLocationButtonDisabled: {
        opacity: 0.7,
    },
    currentLocationButtonText: {
        color: '#fff',
        marginLeft: 8,
    },
    locationInput: {
        height: 44,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
    }
});

export default HomeScreen;


// import React, { useState, useContext, useEffect } from 'react';
// import {
//     StyleSheet,
//     Text,
//     View,
//     SafeAreaView,
//     TextInput,
//     TouchableOpacity,
//     Alert,
//     ActivityIndicator,
//     StatusBar,
//     KeyboardAvoidingView,
//     Platform,
//     ScrollView,
//     Dimensions,
//     Animated,
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { UserContext } from '../../contexts/UserContext';
// import api from '../../services/api';
// import Icon from 'react-native-vector-icons/Octicons';
// import authService from '../../services/authService';

// const { width } = Dimensions.get('window');
// const MAX_WIDTH = Math.min(width * 0.9, 400);

// const HomeScreen = ({ navigation }) => {
//     const [description, setDescription] = useState('');
//     // const [analyzedData, setAnalyzedData] = useState(null);
//     const [isAnalyzing, setIsAnalyzing] = useState(false);
//     const [isLoading, setIsLoading] = useState(false);
//     const { user } = useContext(UserContext);
//     const [pulseAnim] = useState(new Animated.Value(1));

//     useEffect(() => {
//         const pulse = Animated.sequence([
//             Animated.timing(pulseAnim, {
//                 toValue: 1.02,
//                 duration: 2000,
//                 useNativeDriver: true,
//             }),
//             Animated.timing(pulseAnim, {
//                 toValue: 1,
//                 duration: 1000,
//                 useNativeDriver: true,
//             }),
//         ]);

//         Animated.loop(pulse).start();
//     }, []);

//     const handlePost = async () => {
//         if (!description.trim()) {
//             Alert.alert('Error', 'Please describe your task');
//             return;
//         }
    
//         setIsLoading(true);
    
//         try {
//             const token = await AsyncStorage.getItem('userToken');
//             if (!token) {
//                 Alert.alert('Error', 'You must be logged in to post a task');
//                 return;
//             }
    
//             const response = await authService.fetchWithSilentAuth(api => 
//                 api.post('/tasks', {
//                     postContent: description.trim()
//                 }, {
//                     validateStatus: status => status < 500
//                 })
//             );
    
//             if (response.status === 201 && response.data) {
//                 Alert.alert(
//                     'Success', 
//                     'Task has been posted!',
//                     [{ text: 'OK', onPress: () => {
//                         setDescription('');
//                         // Optionally trigger a refresh of tasks list
//                         // if (onTaskCreated) onTaskCreated(response.data);
//                     }}]
//                 );
//             } else {
//                 const errorMessage = response.data?.error || 'Failed to post task';
//                 Alert.alert('Error', errorMessage);
//                 console.error('Task creation failed:', response);
//             }
//         } catch (error) {
//             console.error('Error posting task:', error);
//             const errorMessage = error.response?.data?.error || 'Network error while posting task';
//             Alert.alert('Error', errorMessage);
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <SafeAreaView style={styles.container}>
//             <StatusBar barStyle="light-content" backgroundColor="#1A202C" />
//             <KeyboardAvoidingView
//                 behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//                 style={styles.keyboardView}
//             >
//                 <ScrollView 
//                     contentContainerStyle={styles.scrollContainer}
//                     keyboardShouldPersistTaps="handled"
//                 >
//                     <View style={styles.contentContainer}>
//                         <View style={styles.headerSection}>
//                         <Text style={styles.preTitle}>
//                             Hi {user ? user.firstName : ''},
//                             </Text>
//                             <Text style={styles.title}>What task would you like to request?</Text>
//                         </View>
//                         <View style={styles.inputWrapper}>
//                             <Animated.View style={[
//                                 styles.inputContainer,
//                                 // { transform: [{ scale: !analyzedData ? pulseAnim : 1 }] }
//                             ]}>
//                                 <TextInput
//                                     style={styles.textArea}
//                                     placeholder="Describe your task with all relevant details (ie. location, time, etc.)"
//                                     placeholderTextColor="#999"
//                                     multiline
//                                     value={description}
//                                     onChangeText={setDescription}
//                                     textAlignVertical="top"
//                                 />
//                             </Animated.View>

//                             <TouchableOpacity 
//                                 style={[
//                                     styles.postButton,
//                                     (!description.trim() || isLoading) 
//                                 ]}
//                                 onPress={handlePost}
//                                 disabled={!description.trim() || isLoading}
//                             >
//                                 {isAnalyzing ? (
//                                     <ActivityIndicator color="#fff" />
//                                 ) : (
//                                     <>
//                                         <Text style={styles.analyzeButtonText}>Post Task</Text>
//                                         <Icon name="upload" size={20} color="#fff" style={styles.buttonIcon} />
//                                     </>
//                                 )}
//                             </TouchableOpacity>
//                             {/* <TouchableOpacity 
//                                 style={styles.viewTasksButton}
//                                 onPress={() => navigation.navigate('ActivityScreen')}
//                             >
//                                 <Text style={styles.viewTasksButtonText}>View Requested Tasks</Text>
//                                 <Icon name="list" size={20} color="#3717ce" style={styles.buttonIcon} />
//                             </TouchableOpacity> */}
//                         </View>
//                     </View>
//                 </ScrollView>
//             </KeyboardAvoidingView>
//         </SafeAreaView>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#fff',
//     },
//     keyboardView: {
//         flex: 1,
//     },
//     scrollContainer: {
//         flexGrow: 1,
//     },
//     contentContainer: {
//         flex: 1,
//         alignItems: 'center',
//         paddingHorizontal: 20,
//     },
//     headerSection: {
//         width: MAX_WIDTH,
//         marginVertical: 40,
//     },
//     preTitle: {
//         fontSize: 18,
//         color: '#666',
//         marginBottom: 8,
//         fontWeight: '600',
//     },
//     title: {
//         fontSize: 32,
//         fontWeight: 'bold',
//         color: '#3717ce',
//         lineHeight: 40,
//     },
//     inputWrapper: {
//         width: MAX_WIDTH,
//     },
//     inputContainer: {
//         backgroundColor: '#f0f0f0', // Changed to gray
//         borderRadius: 20,
//         padding: 20,
//         marginBottom: 20,
//         borderWidth: 1,
//         borderColor: '#e0e0e0', // Slightly darker border
//         shadowColor: '#3717ce',
//         shadowOffset: { width: 0, height: 0 },
//         shadowOpacity: 0.1,
//         shadowRadius: 20,
//         elevation: 5,
//     },
//     textArea: {
//         minHeight: 120,
//         fontSize: 16,
//         color: '#333',
//         lineHeight: 24,
//     },
//     postButton: {
//         backgroundColor: '#3717ce',
//         padding: 18,
//         borderRadius: 16,
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         shadowColor: '#3717ce',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.3,
//         shadowRadius: 12,
//         elevation: 8,
//     },
//     disabledButton: {
//         opacity: 0.7,
//     },
//     analyzeButtonText: {
//         color: '#fff',
//         fontSize: 18,
//         fontWeight: '600',
//     },
//     buttonIcon: {
//         marginLeft: 8,
//     },
//     analysisContainer: {
//         width: MAX_WIDTH,
//         marginTop: 30,
//         marginBottom: 40,
//     },
//     analysisHeader: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 20,
//     },
//     glowCircle: {
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         backgroundColor: '#3182CE',
//         alignItems: 'center',
//         justifyContent: 'center',
//         shadowColor: '#63B3ED',
//         shadowOffset: { width: 0, height: 0 },
//         shadowOpacity: 0.5,
//         shadowRadius: 10,
//     },
//     sectionTitle: {
//         fontSize: 20,
//         fontWeight: '600',
//         color: '#fff',
//         marginLeft: 10,
//     },
//     detailsList: {
//         gap: 12,
//     },
//     detailCard: {
//         flexDirection: 'row',
//         backgroundColor: '#2D3748',
//         padding: 16,
//         borderRadius: 16,
//         borderWidth: 1,
//         borderColor: '#4A5568',
//     },
//     iconContainer: {
//         width: 40,
//         height: 40,
//         borderRadius: 12,
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     detailContent: {
//         marginLeft: 12,
//         flex: 1,
//     },
//     detailLabel: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: '#fff',
//         marginBottom: 4,
//     },
//     detailText: {
//         fontSize: 15,
//         color: '#A0AEC0',
//         lineHeight: 20,
//     },
//     submitButton: {
//         backgroundColor: '#3182CE',
//         padding: 18,
//         borderRadius: 16,
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginTop: 24,
//         shadowColor: '#63B3ED',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.3,
//         shadowRadius: 12,
//         elevation: 8,
//     },
//     submitButtonText: {
//         color: '#fff',
//         fontSize: 18,
//         fontWeight: '600',
//     },
//     submitButtonIcon: {
//         marginLeft: 8,
//     },
//     viewTasksButton: {
//         backgroundColor: '#fff',
//         padding: 18,
//         borderRadius: 16,
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginTop: 12,
//         borderWidth: 2,
//         borderColor: '#3717ce',
//     },
//     viewTasksButtonText: {
//         color: '#3717ce',
//         fontSize: 18,
//         fontWeight: '600',
//     },
// });

// export default HomeScreen;