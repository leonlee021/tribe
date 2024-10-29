import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useStripe, CardForm } from '@stripe/stripe-react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';


const AddCardScreen = () => {
  const [loading, setLoading] = useState(false);
  const [savedCard, setSavedCard] = useState(null);
  const [cardDetails, setCardDetails] = useState({});
  const stripe = useStripe();
  const navigation = useNavigation();

  useEffect(() => {
    fetchSavedCard();
  }, []);

  const fetchSavedCard = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await api.get('/payment/saved-card', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedCard(response.data.card); // This will be null if no card is saved
    } catch (error) {
      console.error('Error fetching saved card:', error);
      setSavedCard(null); // Ensure savedCard is null in case of error
    }
  };

  const handleAddCard = async () => {
    if (!cardDetails?.complete) {
      Alert.alert('Error', 'Please enter complete card details');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await api.post('/payment/setup-intent', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { clientSecret } = response.data;

      const { setupIntent, error } = await stripe.confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: cardDetails.billingDetails,
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else if (setupIntent.status === 'Succeeded') {
        Alert.alert('Success', 'Card added successfully!');
        fetchSavedCard(); // Refresh the saved card
      }
    } catch (error) {
      console.error('Error in handleAddCard:', error);
      Alert.alert('Error', 'Failed to add card');
    } finally {
      setLoading(false);
    }
  };

  const getCardIcon = (brand) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return 'card';
      case 'mastercard':
        return 'card';
      case 'amex':
        return 'card';
      // Add more cases as needed
      default:
        return 'card-outline';
    }
  };

  const handleRemoveCard = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      await api.post('/payment/remove-card', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Success', 'Card removed successfully');
      setSavedCard(null);
    } catch (error) {
      console.error('Error removing card:', error);
      Alert.alert('Error', 'Failed to remove card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Payment</Text>
          </View>
  
          {/* Content */}
          {savedCard ? (
          // Saved Card View
          <View style={styles.savedCardContainer}>
            <View style={styles.cardInfo}>
              <Icon
                name={getCardIcon(savedCard.brand)}
                size={30}
                color="#1DA1F2"
                style={styles.cardIcon}
              />
              <Text style={styles.savedCardText}>
                {savedCard.brand} ending in {savedCard.last4}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleRemoveCard}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.removeButtonText}>Remove Card</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Add Card Form
          <View style={styles.noCardContainer}>
            <Icon name="card-outline" size={50} color="#1DA1F2" style={styles.noCardIcon} />
            <Text style={styles.noCardText}>No card saved</Text>
            <Text style={styles.instructionsText}>Please add a credit/debit card to enable payments!</Text>
            <CardForm
              style={styles.cardForm}
              onFormComplete={(details) => {
                setCardDetails(details);
              }}
              autofocus
              cardStyle={{
                backgroundColor: '#FFFFFF',
                textColor: '#000000',
                placeholderColor: '#A9A9A9',
                borderRadius: 8,
                borderColor: '#E0E0E0',
                borderWidth: 1,
              }}
              placeholder={{
                number: '4242 4242 4242 4242',
              }}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddCard}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>Save Card</Text>
              )}
            </TouchableOpacity>
          </View>

          )}
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
  
};

export default AddCardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30, // Provides adequate spacing
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  savedCardContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eaeaea',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  savedCardText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 15,
  },
  removeButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noCardContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eaeaea',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 30,
  },
  noCardText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 15,
    textAlign: 'center',
  },
  cardForm: {
    width: '100%',
    height: 100, // Keeps the CardForm compact
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#1DA1F2',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardIcon: {
    marginRight: 10,
  },
  savedCardText: {
    fontSize: 18,
    color: '#333',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardIcon: {
    marginRight: 10,
  },
  noCardContainer: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eaeaea',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 30,
  },
  noCardIcon: {
    marginBottom: 15,
  },
  noCardText: {
    fontSize: 20,
    color: '#333',
    marginBottom: 10,
    fontWeight: '600',
  },
  instructionsText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  savedCardContainer: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eaeaea',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 30,
  },
  savedCardText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  
});

