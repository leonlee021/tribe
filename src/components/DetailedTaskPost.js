import React, { useState, useEffect, memo } from 'react';
import { 
  View, Text, TouchableOpacity, Image, StyleSheet, Alert,ScrollView, Dimensions, TextInput, Modal 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import OfferModal from '../components/OfferModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const DetailedTaskPost = ({
  task,
  loggedInUserId,
  hasSubmittedReview,
  onMarkComplete,
  notificationCount,
  onCancelTask,
  onViewChat,
  onViewTask,
  onLeaveReview,
  onViewProfile,
  onAcceptOffer,
  onDeleteTask, 
  onImageError, 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [review, setReview] = useState('');  // For the review text input
  const [rating, setRating] = useState(0);   // For the rating out of 5 stars
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [localHasSubmittedReview, setLocalHasSubmittedReview] = useState(hasSubmittedReview);
  const navigation = useNavigation();

  useEffect(() => {
    setLocalHasSubmittedReview(hasSubmittedReview);
  }, [hasSubmittedReview]);

    // This is where we determine if the task was cancelled for the tasker
    const isTaskCancelled = task.cancellations && task.cancellations.length > 0;
  

  if (task.deleted) {
    return null; // Do not render if the task is marked as deleted
  }

  const isTaskOwner = loggedInUserId
    ? String(task.userId) === String(loggedInUserId)
    : false;

  const formattedDate = timeSince(task.createdAt);
  const profilePhotoUrl = task.requester && task.requester.profilePhotoUrl ? task.requester.profilePhotoUrl : null;

  const taskerAccepted = task.taskerAcceptedId && (task.status === 'active' || task.status === 'completed');

  const renderTaskPhotos = () => {
    const photos = task.photos || [];
    console.log('Task photos in TaskPost:', photos);
    if (photos.length > 0) {
      return (
        <TouchableOpacity onPress={() => setIsPhotoModalVisible(true)} style={styles.photoContainer}>
          <Image 
            source={{ uri: photos[0] }} 
            style={styles.coverPhoto} 
            onError={() => {
              Alert.alert('Image Load Error', 'Failed to load image. Refreshing...');
              onImageError(); // Trigger task refresh
            }}
          />
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

  const handleMarkComplete = () => {
    Alert.alert(
      'Complete Task',
      'Are you sure you want to mark this task as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => onMarkComplete(task.chatId) },
      ]
    );
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      onViewTask(task.id); // Clear offer notifications only when expanding
    }
};

  const handleCancelTask = () => {
    onCancelTask(task.chatId);
  };


  const handleDeleteTask = () => {
    onDeleteTask(task.id);
  };

  const handleViewChat = () => {
    onViewChat(task.chatId);
  };

  const submitReview = async () => {
    const chatId = task.chatId; 
    if (rating > 0 && review.trim()) {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) throw new Error('User token not found');

            await api.post(
                `/reviews`,
                { chatId, rating, review },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            Alert.alert('Review Submitted', 'Your review has been successfully submitted.');
            setLocalHasSubmittedReview(true); // Update local state
            onLeaveReview(task.id); 
            setReview(''); // Clear the review input
            setRating(0); // Reset the rating
        } catch (error) {
            console.error('Error submitting review:', error);
            Alert.alert('Error', 'Failed to submit review.');
        }
    } else {
        Alert.alert('Invalid Input', 'Please provide both a rating and a review.');
    }
};

const renderTaskActions = () => {
  if (!isTaskOwner && isTaskCancelled) {
    return;
  }

  return (
    <View style={styles.actionButtonsContainer}>
      {/* View Offers Button: Show if task.status is not 'open' */}
      {isTaskOwner && (task.status !== 'open') && (
        <TouchableOpacity
          style={[styles.actionButton, styles.viewOffersButton]}
          onPress={handleExpand}
        >
          <Text style={styles.buttonText}>{isExpanded ? 'Hide Details' : 'View Offers'}</Text>
          {notificationCount > 0 && (
            <View style={styles.notificationBadgeButton}>
              <Text style={styles.notificationText}>{notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Delete Button: Show if task.status is 'open' or 'offered' */}
      {isTaskOwner && (task.status === 'open' || task.status === 'offered') && (
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDeleteTask}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      )}

      {/* Mark as Complete Button: Show if task.status is 'active' */}
      {isTaskOwner && task.status === 'active' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={handleMarkComplete}
        >
          <Text style={styles.buttonText}>Mark as Completed</Text>
        </TouchableOpacity>
      )}

      {/* Cancel Task Button: Show if task.status is 'active' */}
      {task.status === 'active' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={handleCancelTask}
        >
          <Text style={styles.buttonText}>Cancel Task</Text>
        </TouchableOpacity>
      )}

      {/* Chat Button: Show if task.status is 'active' or 'completed' */}
      {(task.status === 'active' || task.status === 'completed' || task.status === 'cancelled') && (
        <TouchableOpacity
          style={[styles.actionButton, styles.chatButton]}
          onPress={handleViewChat}
        >
          <Icon name="comments" size={20} color="#fff" />
          <Text style={styles.buttonText}> Chat</Text>
        </TouchableOpacity>
      )}

      {/* Leave a Review Button: Show if task.status is 'completed' and review has not been submitted */}
      {task.status === 'completed' && (
        <View style={styles.reviewContainer}>
          {hasSubmittedReview ? (
            <Text style={styles.reviewSubmittedText}>Your review has been submitted</Text>
          ) : (
            <>
              <Text style={styles.reviewTitle}>Leave a Review</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Write your review..."
                value={review}
                onChangeText={setReview}
                multiline
                placeholderTextColor="#aaa"
              />
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingLabel}>Rate out of 5: </Text>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Text style={styles.star}>{star <= rating ? '★' : '☆'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.submitButton} onPress={submitReview}>
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
};

  const isOfferedTask = task.status === 'offered';
  const isActiveTask = task.status === 'active';
  const isCompletedTask = task.status === 'completed';

  console.log("Cancellations:", task.cancellations);

  
  return (
    <View 
      style={[
        styles.postContainer, 
        isTaskCancelled && styles.offeredTaskBorder,
        isOfferedTask && styles.offeredTaskBorder, 
        isActiveTask && styles.activeTaskBorder, 
        isCompletedTask && styles.completedTaskBorder,
        !isTaskOwner && isTaskCancelled && styles.cancelledTaskBorder,
      ]}
    >
{isTaskCancelled ? (
  <View style={styles.statusContainer}>
    {isTaskOwner ? (
      <>
        <Text style={styles.offeredStatusText}>Offered</Text> 
        <View style={styles.cancellationReasonContainer}>
          <Text style={styles.cancellationReasonTitle}>Cancellation Reason:</Text>
          {task.cancellations.map((cancellation, index) => (
            <Text key={index} style={styles.cancellationReasonText}>
              {task.cancellations.length > 1
                ? `Cancellation ${index + 1}: ${cancellation.reason ? cancellation.reason : 'No reason provided.'}`
                : cancellation.reason || 'No reason provided.'}
            </Text>
          ))}
        </View>

      </>
    ) : (
      <>
        {task.cancellations.some(cancellation => cancellation.canceledByRole === 'tasker') ? (
          <Text style={styles.cancelledLabel}>You canceled your offer</Text>
        ) : (
          <Text style={styles.cancelledLabel}>Your offer was canceled by the requester</Text>
        )}
        <View style={styles.cancellationReasonContainer}>
        <Text style={styles.cancellationReasonTitle}>Cancellation Reason:</Text>
        <Text style={styles.cancellationReasonText}>
            {task.cancellations[task.cancellations.length - 1].reason || 'No reason provided.'}
          </Text>
        </View>
      

      </>
    )}
    </View>
    ) : (
      <>
        {isOfferedTask && (
          <View style={styles.statusContainer}>
            <Text style={styles.offeredStatusText}>Received Offers</Text>
          </View>
        )}
        {isActiveTask && (
          <View style={styles.statusContainer}>
            <Text style={styles.activeStatusText}>Active</Text>
          </View>
        )}
        {isCompletedTask && (
          <View style={styles.statusContainer}>
            <Text style={styles.completedStatusText}>Completed</Text>
          </View>
        )}
      </>
    )}
  
      {/* Header with Task Name, Price, Expand Button, and Notification Badge */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.taskName}>{task.taskName || 'Untitled Task'}</Text>

          {/* Notification Badge */}
          {notificationCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationText}>{notificationCount}</Text>
          </View>
          )}

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
  
      <Text style={styles.taskerCountText}>
        {task.appliedByCount} tasker{task.appliedByCount !== 1 ? 's' : ''} {task.appliedByCount !== 1 ? 'have' : 'has'} applied
      </Text>

      {(task.status === 'active' || task.status === 'completed') && task.tasker && (
        <View style={styles.taskerContainer}>
            <Text style={styles.taskerAssignedText}>Assigned to</Text>
            <View style={styles.taskerProfileWrapper}>
            <TouchableOpacity onPress={() => onViewProfile(task.tasker.id)} style={styles.taskerProfileContainer}>
                {task.tasker.profilePhotoUrl ? (
                <Image source={{ uri: task.tasker.profilePhotoUrl }} style={styles.taskerProfilePhoto} />
                ) : (
                <Icon name="user-circle" size={50} color="#e1e1e1" />
                )}
                <Text style={styles.taskerName}>
                {`${task.tasker.firstName} ${task.tasker.lastName}`}
                </Text>
            </TouchableOpacity>
            </View>
        </View>
        )}
  
      {/* Offers Section (Expanded View) */}
      {isTaskOwner && isExpanded && task.offers && task.offers.length > 0 && (
        <View style={styles.offersContainer}>
          <Text style={styles.sectionTitle}>Offers</Text>
          {task.offers.map((offer) => (
            <View key={offer.id} style={styles.offerItem}>
              <TouchableOpacity onPress={() => onViewProfile(offer.tasker?.id)} style={styles.offerHeader}>
                {offer.tasker?.profilePhotoUrl ? (
                  <Image source={{ uri: offer.tasker.profilePhotoUrl }} style={styles.offerProfilePhoto} />
                ) : (
                  <Icon name="user-circle" size={50} color="#e1e1e1" />
                )}
                <View style={styles.offerTaskerInfo}>
                  <Text style={styles.offerTaskerName}>{`${offer.tasker.firstName} ${offer.tasker.lastName}`}</Text>
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={14} color="#FFD700" />
                    <Text style={styles.averageRating}>
                      {offer.tasker.averageRating ? offer.tasker.averageRating : 'N/A'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={styles.offerPrice}>
                {`$${offer.offerPrice !== undefined ? offer.offerPrice : 'N/A'}`}
              </Text>
              <Text style={styles.offerMessage}>
                {offer.offerMessage || 'No message provided.'}
              </Text>
              {/* Status Indication */}
              {offer.status === 'accepted' && (
                <Text style={styles.acceptedLabel}>Offer Accepted</Text>
              )}
              {offer.status === 'cancelled' && (
                <View style={styles.offerCancelledContainer}>
                  <Text style={styles.cancelledLabel}>Offer Cancelled</Text>
                </View>
              )}
              {/* Accept Offer Button (disable for cancelled) */}
              {offer.status !== 'accepted' && offer.status !== 'cancelled' && task.status !== 'active' && (
                <TouchableOpacity
                  style={styles.acceptOfferButton}
                  onPress={() => onAcceptOffer(offer.id)}
                >
                  <Text style={styles.acceptOfferButtonText}>Accept Offer</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
  
      {/* Action Buttons */}
      {renderTaskActions()}

      {/* Photo Modal */}
      {isPhotoModalVisible && (
        <Modal
          visible={isPhotoModalVisible}
          transparent={true}
          animationType="slide"
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
                    onError={() => {
                      Alert.alert('Image Load Error', 'Failed to load image. Refreshing...');
                      onImageError(); // Trigger task refresh
                    }}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

    </View>
  );
  
};

// Time formatting function
function timeSince(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;

  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return Math.floor(seconds) + ' seconds ago';
}

export default DetailedTaskPost;


const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  postContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3, // For Android shadow
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTextContainer: {
    flex: 1,
    flexDirection: 'column',
    position: 'relative',
  },
  taskName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  taskPrice: {
    fontSize: 25,
    fontWeight: '700',
    color: '#3717ce',
    marginTop: 4,
  },
  expandButton: {
    padding: 8,
  },
  
  viewOffersButton: {
    backgroundColor: '#3717ce', // Blue for "View Offers"
    position: 'relative', // Required for absolute positioning of the badge
  },
  notificationBadgeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
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
  taskerCountText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 12,
  },
  offersContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },
  offerItem: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2, // For Android shadow
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerProfilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  offerTaskerInfo: {
    marginLeft: 12,
  },
  offerTaskerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  offerPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3717ce',
    marginBottom: 8,
  },
  offerMessage: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  acceptedLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  acceptOfferButton: {
    backgroundColor: '#3717ce',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptOfferButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  reviewSubmittedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 10,
    fontStyle: 'italic'
  },
  cancelledLabel: {
    color: '#ff4d4d',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
  },
  cancelledStatusText: {
    color: 'red',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancellationReasonContainer: {
    backgroundColor: '#ffe6e6',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  cancellationReasonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#cc0000',
    marginBottom: 3,
  },
  cancellationReasonText: {
    fontSize: 14,
    color: '#cc0000',
  },
  actionButtonsContainer: {
    flexDirection: 'column',  // Change to column for vertical stacking
    justifyContent: 'center', // Center the buttons
    alignItems: 'stretch',  // Make buttons stretch across the width
    marginTop: 12,
    marginHorizontal: 10,  // Ensure padding on the sides
  },
  deleteButton: {
    backgroundColor: '#ff4d4d',
    // paddingVertical: 14,
    // borderRadius: 8,
    // alignItems: 'center',
    // marginTop: 16,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  offeredTaskBorder: {
    borderColor: '#3717ce', // Green for active task
    borderWidth: 2,
    borderRadius: 12,
  },
  activeTaskBorder: {
    borderColor: '#3717ce', // Green for active task
    borderWidth: 2,
    borderRadius: 12,
  },
  
  completedTaskBorder: {
    borderColor: '#6c757d', // Gray for completed task
    borderWidth: 2,
    borderRadius: 12,
  },
  cancelledTaskBorder: {
    borderColor: '#6c757d', // Gray for completed task
    borderWidth: 2,
    borderRadius: 12,
  },
  
  statusContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  offeredStatusText: {
    fontSize: 20,
    color: '#3717ce',
    fontWeight: 'bold',
  },
  cancelledStatusText: {
    fontSize: 20,
    color: 'red',
    fontWeight: 'bold',
  },
  activeStatusText: {
    fontSize: 20,
    color: '#3717ce',
    fontWeight: 'bold',
  },
  
  completedStatusText: {
    fontSize: 20,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'column',  // Stack buttons vertically
    justifyContent: 'center',
    alignItems: 'center',  // Center align buttons
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '90%',  // Ensure all buttons are the same width
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 5, // Space between buttons
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  completeButton: {
    backgroundColor: '#3717ce', // Green for "Mark as Completed"
  },
  cancelButton: {
    backgroundColor: '#ff4d4d', // Red for "Cancel Task"
  },
  reviewButton: {
    backgroundColor: '#4CAF50', // Yellow for "Leave a Review"
  },
  chatButton: {
    backgroundColor: '#1DA1F2',
    position: 'relative', // Required for absolute positioning of the badge
  },
  reviewContainer: {
    padding: 20,
    backgroundColor: '#f9f9f9',
},
reviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
},
reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    height: 100,
},
ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
},
star: {
    fontSize: 24,
    marginHorizontal: 5,
    color: '#FFD700',
},
submitButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
},
submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
},
taskerContainer: {
    backgroundColor: '#f1f8ff', // Light blue background to highlight the tasker section
    padding: 15,
    borderRadius: 10,
    marginVertical: 12, // Space around the tasker section
    borderColor: '#1DA1F2', // Border color that matches the task's primary color
    borderWidth: 1,
  },
  taskerAssignedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1DA1F2', // Match the task color
    marginBottom: 10,
    textAlign: 'center', // Centered to emphasize the message
  },
  taskerProfileWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskerProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the content horizontally
  },
  taskerProfilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15, // Increase margin for better spacing
  },
  taskerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10, // Add left margin to ensure spacing from profile picture
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
    width: width,    // Set width to device's screen width
    height: height,  // Set height to device's screen height
    justifyContent: 'center',
    alignItems: 'center',
  },

  fullScreenPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  
  
  
});
