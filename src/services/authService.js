import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth0Config } from '../../auth0Config.js';

const redirectUri = AuthSession.makeRedirectUri({ 
    scheme: 'mutually',
    useProxy: true 
});
const auth0Domain = auth0Config.domain;
const auth0ClientId = auth0Config.clientId;

export const loginWithAuth0 = async () => {
    try {
        const authUrl = `${auth0Domain}/authorize?client_id=${auth0ClientId}&redirect_uri=${redirectUri}&response_type=token&scope=openid profile email offline_access`;
        
        const result = await AuthSession.startAsync({ authUrl });

        if (result.type === 'success' && result.params.access_token) {
            await AsyncStorage.setItem('accessToken', result.params.access_token);
            if (result.params.refresh_token) {
                await AsyncStorage.setItem('refreshToken', result.params.refresh_token);
            }
            console.log('Logged in with Auth0, access token:', result.params.access_token);
            return true;
        } else {
            console.error('Error during Auth0 login:', result);
            return false;
        }
    } catch (error) {
        console.error('Error during Auth0 login:', error);
        return false;
    }
};

export const logoutWithAuth0 = async () => {
    try {
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        console.log('Logged out from Auth0');
    } catch (error) {
        console.error('Error during Auth0 logout:', error);
    }
};

export const isAuthenticated = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return !!token;
};

export const refreshAuthToken = async () => {
    try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
            console.error('No refresh token available');
            return null;
        }

        const refreshUrl = `${auth0Domain}/oauth/token`;
        const response = await axios.post(refreshUrl, {
            grant_type: 'refresh_token',
            client_id: auth0ClientId,
            refresh_token: refreshToken,
        });

        if (response.data && response.data.access_token) {
            await AsyncStorage.setItem('accessToken', response.data.access_token);
            if (response.data.refresh_token) {
                await AsyncStorage.setItem('refreshToken', response.data.refresh_token);
            }
            return response.data.access_token;
        } else {
            console.error('Failed to refresh access token');
            return null;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
    }
};
