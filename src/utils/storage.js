import AsyncStorage from '@react-native-async-storage/async-storage';

// Store JWT Token
export const storeToken = async (token) => {
    try {
        await AsyncStorage.setItem('userToken', token);
    } catch (error) {
        console.error('Error storing the token', error);
    }
};

// Retrieve JWT Token
export const getToken = async () => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        return token;
    } catch (error) {
        console.error('Error retrieving the token', error);
        return null;
    }
};

// Remove JWT Token (e.g., on logout)
export const removeToken = async () => {
    try {
        await AsyncStorage.removeItem('userToken');
    } catch (error) {
        console.error('Error removing the token', error);
    }
};
