// contexts/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      try {
        let endpoint = '/users/profile'; // Default endpoint for current user
        const response = await api.get(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  };


  useEffect(() => {
    fetchUserProfile();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, fetchUserProfile }}>
      {!isLoading && children}
    </UserContext.Provider>
  );
};

//export default UserProvider;