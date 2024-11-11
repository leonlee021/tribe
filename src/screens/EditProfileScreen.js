import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { UserContext } from '../contexts/UserContext'; 

const EditProfileScreen = ({ navigation }) => {
  const { fetchUserProfile } = useContext(UserContext); 
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [about, setAbout] = useState('');
  const [location, setLocation] = useState('');
  const [experience, setExperience] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        try {
          const response = await api.get('/users/profile', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const user = response.data;
          setFirstName(user.firstName || '');
          setLastName(user.lastName || '');
          setAbout(user.about || '');
          setLocation(user.location || '');
          setExperience(user.experience || '');
          setAge(user.age ? String(user.age) : '');
          setGender(user.gender || '');
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      }
    };

    fetchUserProfile();
  }, []);

  const handleSave = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const updatedData = {
        firstName,
        lastName,
        about,
        location,
        experience,
        age: parseInt(age, 10),
        gender,
      };

      const response = await api.put('/users/profile', updatedData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data) {
        // Update the global user context
        await fetchUserProfile();
        
        Alert.alert('Success', 'Profile updated successfully!', [
          {
            text: 'OK',
            onPress: () => {
              // Force a fresh reload of the profile screen
              navigation.navigate('ProfileScreen', { refresh: Date.now() });
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Edit Profile</Text>
      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor="#999"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        placeholderTextColor="#999"
        value={lastName}
        onChangeText={setLastName}
      />
      <TextInput
        style={styles.input}
        placeholder="About"
        placeholderTextColor="#999"
        value={about}
        onChangeText={setAbout}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Location"
        placeholderTextColor="#999"
        value={location}
        onChangeText={setLocation}
      />
      <TextInput
        style={styles.input}
        placeholder="Experience"
        placeholderTextColor="#999"
        value={experience}
        onChangeText={setExperience}
      />
      <TextInput
        style={styles.input}
        placeholder="Age"
        placeholderTextColor="#999"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Gender"
        placeholderTextColor="#999"
        value={gender}
        onChangeText={setGender}
      />
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#1DA1F2',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;
