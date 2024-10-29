import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Badge = ({ count }) => (
  count > 0 ? (
    <View style={styles.badge}>
      <Text style={styles.text}>{count}</Text>
    </View>
  ) : null
);

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -10,
    top: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default Badge;
