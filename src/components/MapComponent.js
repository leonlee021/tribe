// MapComponent.js
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const MapComponent = ({ location, title = "Location", height = 200 }) => {
    // If location is a string, return null or a placeholder
    if (typeof location === 'string' || !location) {
        return null;
    }

    const region = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    return (
        <View style={[styles.container, { height }]}>
            <MapView
                style={styles.map}
                initialRegion={region}
            >
                <Marker
                    coordinate={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                    }}
                    title={title}
                />
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        marginVertical: 10,
    },
    map: {
        width: '100%',
        height: '100%',
    }
});

export default MapComponent;