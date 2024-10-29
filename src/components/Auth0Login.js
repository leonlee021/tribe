import React, { useState } from 'react';
import { Button, Text, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';

const auth0ClientId = 'YOUR_AUTH0_CLIENT_ID';
const authorizationEndpoint = 'https://YOUR_AUTH0_DOMAIN/authorize';

const Auth0Login = ({ onLoginSuccess }) => {
    const [authResult, setAuthResult] = useState(null);

    const handleLogin = async () => {
        const redirectUri = AuthSession.makeRedirectUri();
        const authUrl = `${authorizationEndpoint}?client_id=${auth0ClientId}&redirect_uri=${redirectUri}&response_type=token&scope=openid profile email`;

        const result = await AuthSession.startAsync({ authUrl });
        if (result.type === 'success') {
            setAuthResult(result);
            onLoginSuccess(result.params.access_token);
        }
    };

    return (
        <View>
            <Button title="Login with Auth0" onPress={handleLogin} />
            {authResult && (
                <Text>Token: {authResult.params.access_token}</Text>
            )}
        </View>
    );
};

export default Auth0Login;
