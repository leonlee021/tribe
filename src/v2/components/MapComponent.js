// MapComponent.js
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Circle } from 'react-native-maps';

const MapComponent = ({ location, title = "Location", height = 200 }) => {
    const mapRef = useRef(null);
    if (typeof location === 'string' || !location) {
        return null;
    }

    useEffect(() => {
        // Animate to the new region whenever location changes
        mapRef.current?.animateToRegion(region, 1000);
    }, [location]);


    const region = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    return (
        <View style={[styles.container, { height }]}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={region}
            >
                <Circle
                    center={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                    }}
                    radius={500} // 500 meters radius
                    fillColor="rgba(65, 105, 225, 0.3)"
                    strokeColor="rgba(65, 105, 225, 0.5)"
                    strokeWidth={2}
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