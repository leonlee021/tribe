// OfferModal.js
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const OfferModal = ({ task, isVisible, onClose, onSubmitOffer }) => {
  const [offerPrice, setOfferPrice] = useState(task.price.toString());
  const [offerMessage, setOfferMessage] = useState('');

  const handleSubmit = () => {
    if (!offerPrice || isNaN(offerPrice)) {
      Alert.alert('Invalid Input', 'Please enter a valid price.');
      return;
    }
    onSubmitOffer(task.id, parseFloat(offerPrice), offerMessage);
    onClose();
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Submit Offer</Text>
          <TextInput
            style={styles.input}
            placeholder="Offer Price"
            keyboardType="numeric"
            value={offerPrice}
            onChangeText={setOfferPrice}
          />
          <TextInput
            style={styles.textArea}
            placeholder="Offer Message"
            multiline
            numberOfLines={4}
            value={offerMessage}
            onChangeText={setOfferMessage}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit Offer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default OfferModal;

// Add styles for OfferModal
// OfferModal.js (continued)
const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '90%',
      backgroundColor: '#fff',
      borderRadius: 15,
      padding: 20,
      elevation: 5, // Shadow for Android
      shadowColor: '#000', // Shadow for iOS
      shadowOffset: { width: 0, height: 2 }, // Shadow for iOS
      shadowOpacity: 0.25, // Shadow for iOS
      shadowRadius: 4, // Shadow for iOS
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1DA1F2',
      marginBottom: 15,
      textAlign: 'center',
    },
    label: {
      fontSize: 16,
      color: '#333',
      marginTop: 10,
      marginBottom: 5,
    },
    input: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      backgroundColor: '#f9f9f9',
    },
    textArea: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      height: 100,
      backgroundColor: '#f9f9f9',
      textAlignVertical: 'top', // For Android to align text at the top
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    submitButton: {
      backgroundColor: '#1DA1F2',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      flex: 1,
      marginRight: 10,
      alignItems: 'center',
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    cancelButton: {
      backgroundColor: '#ccc',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      flex: 1,
      marginLeft: 10,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: '#333',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
  
