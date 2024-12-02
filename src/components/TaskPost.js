import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, Image, StyleSheet, Alert, Modal, ScrollView, Dimensions 
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';
import OfferModal from '../components/OfferModal';
import { useNavigation } from '@react-navigation/native';
import MapComponent from './MapComponent';


const TaskPost = ({
  task,
  onSubmitOffer,
  onAcceptOffer,
  loggedInUserId,
  onViewProfile
}) => {
  const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigation = useNavigation();

  // Skip rendering if the task belongs to the logged-in user
  if (String(task.userId) === String(loggedInUserId)) {
    return null; // Return null to prevent rendering
  }

  const formattedDate = timeSince(task.createdAt);
  const profilePhotoUrl = task.requester && task.requester.profilePhotoUrl ? task.requester.profilePhotoUrl : null;

  const renderTaskPhotos = () => {
    const photos = task.photos || [];
    if (photos.length > 0) {
      return (
        <TouchableOpacity onPress={() => setIsPhotoModalVisible(true)} style={styles.photoContainer}>
          <Image source={{ uri: photos[0] }} style={styles.coverPhoto} />
          {photos.length > 1 && (
            <View style={styles.morePhotosOverlay}>
              <Text style={styles.morePhotosText}>+{photos.length - 1}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }
    return null;
  };

  const userHasApplied = task.offers
    ? task.offers.some(offer => String(offer.taskerId) === String(loggedInUserId))
    : false;

  // Define the `timeSince` function
  function timeSince(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = seconds / 31536000; // Years
    if (interval > 1) return Math.floor(interval) + ' years ago';

    interval = seconds / 2592000; // Months
    if (interval > 1) return Math.floor(interval) + ' months ago';

    interval = seconds / 86400; // Days
    if (interval > 1) return Math.floor(interval) + ' days ago';

    interval = seconds / 3600; // Hours
    if (interval > 1) return Math.floor(interval) + ' hours ago';

    interval = seconds / 60; // Minutes
    if (interval > 1) return Math.floor(interval) + ' minutes ago';

    return Math.floor(seconds) + ' seconds ago';
  }

  // Handle Offer Submission
  const handleSubmitOffer = async (taskId, offerPrice, offerMessage) => {
    try {
      await onSubmitOffer(taskId, offerPrice, offerMessage);
      setIsOfferModalVisible(false);
    } catch (error) {
      console.error('Error submitting offer:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to apply for the task.');
    }
  };

  return (
    <View style={styles.postContainer}>
      {/* Header with Task Name and Expand Button */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.taskName}>{task.taskName || 'Untitled Task'}</Text>
          <Text style={styles.taskPrice}>${task.price !== undefined ? task.price : 'N/A'}</Text>
        </View>
      </View>

      {/* User Information */}
      <View style={styles.profileContainer}>
        <TouchableOpacity onPress={() => onViewProfile(task.requester?.id)}>
          {profilePhotoUrl ? (
            <Image source={{ uri: profilePhotoUrl }} style={styles.profilePhoto} />
          ) : (
            <Icon name="user-circle" size={50} color="#e1e1e1" />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onViewProfile(task.requester?.id)} style={styles.usernameContainer}>
          <Text style={styles.username}>
            {task.requester 
              ? `${task.requester.firstName} ${task.requester.lastName}` 
              : 'Anonymous'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task Description */}
      <Text style={styles.taskDescription}>
        {task.postContent || 'No description provided.'}
      </Text>

      {/* Task Photos */}
      {renderTaskPhotos()}

      {/* Task Details */}
      <View style={styles.taskDetailsContainer}>
        <View style={styles.otherDetailsContainer}>
          <View style={styles.taskDetail}>
            <Icon name="map-marker" size={18} color="#3717ce" />
            <Text style={styles.taskDetailText} numberOfLines={1} ellipsizeMode="tail">
              {task.location || 'No location set'}
            </Text>
          </View>
          <View style={styles.taskDetail}>
            <Icon name="clock-o" size={18} color="#3717ce" />
            <Text style={styles.taskDetailText}>{formattedDate || 'Unknown time'}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {!userHasApplied && task.status !== 'completed' && task.status !== 'active' && (
        <TouchableOpacity 
          style={styles.acceptButton} 
          onPress={() => setIsOfferModalVisible(true)}
        >
          <Text style={styles.acceptButtonText}>Apply</Text>
        </TouchableOpacity>
      )}
      {task.status !== 'active' && userHasApplied && (
        <Text style={styles.alreadyAppliedText}>You have applied for this task.</Text>
      )}

      {task.status === 'active' && (
        <View style={styles.alreadyAcceptedContainer}>
          <Icon name="check-circle" size={18} color="#28a745" /> 
          <Text style={styles.alreadyAcceptedText}>This task has been matched with a tasker.</Text>
        </View>
      )}
      {task.status === 'completed' && (
        <Text style={styles.completedText}>Task Completed</Text>
      )}

      {/* Offer Modal */}
      {isOfferModalVisible && (
        <OfferModal
          task={task}
          isVisible={isOfferModalVisible}
          onClose={() => setIsOfferModalVisible(false)}
          onSubmitOffer={(taskId, offerPrice, offerMessage) => {
            handleSubmitOffer(taskId, offerPrice, offerMessage);
          }}
        />
      )}

      {/* Photo Modal */}
      {isPhotoModalVisible && (
        <Modal
          visible={isPhotoModalVisible}
          transparent={true}
          onRequestClose={() => setIsPhotoModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              onPress={() => setIsPhotoModalVisible(false)}
              style={styles.closeModalButton}
            >
              <Icon name="times" size={30} color="#fff" />
            </TouchableOpacity>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
            >
              {task.photos && task.photos.map((photo, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image
                    source={{ uri: photo }}
                    style={styles.fullScreenPhoto}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Map integration */}
      <MapComponent 
        location={task.location}
        title={`Location for: ${task.title}`}
        height={200}
      />
    </View>
  );
};

export default TaskPost;

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  postContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTextContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  taskPrice: {
    fontSize: 25,
    fontWeight: '700',
    color: '#3717ce',
    marginTop: 4,
  },
  taskName: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    color: '#333',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  usernameContainer: {
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  taskDescription: {
    fontSize: 16,
    color: '#555',
    marginBottom: 12,
    lineHeight: 22,
  },
  taskDetailsContainer: {
    marginBottom: 12,
  },
  taskDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskDetailText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#777',
  },
  acceptButton: {
    backgroundColor: '#3717ce',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  alreadyAppliedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
  alreadyAcceptedContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#e6f4ea', // Light green background for a positive message
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  
  alreadyAcceptedText: {
    color: '#28a745',  // Use green color for success indication
    fontSize: 14,  // Slightly larger font size
    fontWeight: 'bold',  // Semi-bold for a clean professional look
    //marginLeft: 0,  // Add space between the icon and text
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  completedText: {
    color: '#3717ce',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  closeModalButton: {
    position: 'absolute',
    top: 30,
    right: 20,
    zIndex: 1,
  },
  imageWrapper: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  photoContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    marginTop: 10,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  morePhotosOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  morePhotosText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
