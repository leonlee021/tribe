import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';

const data = [
    { id: "123", title: "Request", screen: "Request" },
    { id: "456", title: "Apply", screen: "Accept" },
];

const NavOptions = ({ currentScreen, onSelectView }) => {
    if (currentScreen !== 'Request' && currentScreen !== 'Accept') {
        return null;
    }
    return (
        <View style={styles.navOptionsContainer}>
            <FlatList
                contentContainerStyle={styles.flatlistStyle}
                data={data}
                keyExtractor={(item) => item.id}
                horizontal
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => onSelectView(item.screen)}
                        style={[
                            styles.navStyles,
                            currentScreen === item.screen && styles.activeNavStyles
                        ]}
                    >
                        <View>
                            <Text
                                style={[
                                    styles.navTextStyles,
                                    currentScreen === item.screen ? styles.activeNavTextStyles : styles.inactiveNavTextStyles
                                ]}
                            >
                                {item.title}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
};

export default NavOptions;

const styles = StyleSheet.create({
    navOptionsContainer: {
        alignItems: 'center',
        paddingVertical: 30, // Increased padding for more vertical space
    },
    flatlistStyle: {
        justifyContent: 'space-around',
        flexGrow: 1,
        paddingHorizontal: 30, // Increased horizontal padding to accommodate shadows
    },
    navStyles: {
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 30,
        backgroundColor: "white",
        marginHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
        height: 70,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 5 },
        // shadowOpacity: 0.3, // Slightly increased shadow opacity for visibility
        // shadowRadius: 10,
        elevation: 8, // Increased elevation for a more pronounced shadow
    },
    activeNavStyles: {
        backgroundColor: "#1DA1F2",
        shadowColor: '#FFB74D',
    },
    navTextStyles: {
        fontSize: 25,
        fontWeight: "600",
    },
    activeNavTextStyles: {
        color: 'white',
    },
    inactiveNavTextStyles: {
        color: 'gray',
    },
});