import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Image, 
  ScrollView, TextInput, Alert, Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import OfferModal from '../../components/OfferModal';
import { useNavigation } from '@react-navigation/native';

const ExpandableTaskPost = ({
  task,
  loggedInUserId,
  onHide,
  onMarkComplete,
  onCancelTask,
  onViewChat,
  onViewProfile,
  onAcceptOffer,
  onDeleteTask,
  notificationCount = 0,
  hasSubmittedReview = false,
  isExpanded,
  setIsExpanded,
  onSubmitOffer,
  taskStatus,
  isTaskOwner
}) => {

  const [review, setReview] = useState('');
  const [rating, setRating] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);
  const navigation = useNavigation();

  // const isTaskOwner = String(task.userId) === String(loggedInUserId);
  const isTaskCancelled = task.cancellations?.length > 0;
  const formattedDate = formatDate(task.createdAt);

  const userHasApplied = task.offers?.some(offer => 
    String(offer.taskerId) === String(loggedInUserId)
  );

  const handleMarkComplete = () => {
    Alert.alert(
      'Complete Task',
      'Are you sure you want to mark this task as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => onMarkComplete(task.chatId) }
      ]
    );
  };

  const renderApplySection = () => {
    if (isTaskOwner || (taskStatus !== 'open' && taskStatus !== 'offered')) return null;
    
    return (
        <>
            {!userHasApplied ? (
                <TouchableOpacity 
                    style={styles.applyButton}
                    onPress={() => setIsOfferModalVisible(true)}
                >
                    <Text style={styles.applyButtonText}>Apply Task</Text>
                </TouchableOpacity>
            ) : (
                <Text style={styles.appliedText}>You've already applied</Text>
            )}

            <OfferModal
                task={task}
                isVisible={isOfferModalVisible}
                onClose={() => setIsOfferModalVisible(false)}
                onSubmitOffer={(offerPrice, offerMessage) => {
                    onSubmitOffer(task.id, offerPrice, offerMessage);
                    setIsOfferModalVisible(false);
                }}
            />
        </>
    );
};

  const submitReview = () => {
    if (rating === 0 || !review.trim()) {
      Alert.alert('Invalid Input', 'Please provide both a rating and a review.');
      return;
    }
    // Call your review submission handler here
  };

  const renderStatusBadge = (status) => {
    const statusColors = {
      open: '#28a745',
      active: '#007bff',
      completed: '#6c757d',
      cancelled: '#dc3545'
    };

    return (
      <View style={[styles.statusBadge, { backgroundColor: statusColors[status] }]}>
        <Text style={styles.statusText}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </View>
    );
  };

  const collapsedContent = (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => setIsExpanded(true)}
      activeOpacity={0.7}
    >
      <View style={styles.headerRow}>
        <View style={styles.leftHeader}>
          {renderStatusBadge(task.status)}
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
        {notificationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notificationCount}</Text>
          </View>
        )}
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {task.postContent}
      </Text>  

      <View style={styles.footer}>
        <View style={styles.taskerInfo}>
          <Text style={styles.price}>${task.price}</Text>
        </View>
        <Icon name="chevron-down" size={14} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const expandedContent = (
    <Modal
      visible={isExpanded}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setIsExpanded(false)}
    >
      <View style={styles.modalContainer}>
        <ScrollView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setIsExpanded(false)}
              style={styles.closeButton}
            >
              <Icon name="times" size={24} color="#333" />
            </TouchableOpacity>
            {renderStatusBadge(task.status)}
          </View>

          {/* <Text style={styles.modalTitle}>{task.taskName || 'Untitled Task'}</Text> */}
          <Text style={styles.modalPrice}>${task.price}</Text>

          <View style={styles.requesterInfo}>
            <TouchableOpacity 
              style={styles.profileInfo}
              onPress={() => onViewProfile(task.requester?.id)}
            >
              {task.requester?.profilePhotoUrl ? (
                <Image 
                  source={{ uri: task.requester.profilePhotoUrl }} 
                  style={styles.profilePhoto} 
                />
              ) : (
                <Icon name="user-circle" size={50} color="#e1e1e1" />
              )}
              <Text style={styles.requesterName}>
                {`${task.requester?.firstName} ${task.requester?.lastName}`}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>{task.postContent}</Text>


          {(task.status === 'active' || task.status === 'completed') && task.taskerAcceptedId && task.tasker && (
            <View style={styles.taskerContainer}>
              <Text style={styles.taskerAssignedText}>Assigned to</Text>
              <TouchableOpacity 
                onPress={() => onViewProfile(task.taskerAcceptedId)}
                style={styles.taskerProfileContainer}
              >
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
          )}

          {/* Add offers section */}
          {isTaskOwner && task.offers && task.offers.length > 0 && (
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
                          {offer.tasker.averageRating ? offer.tasker.averageRating.toFixed(1) : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.offerPrice}>${parseFloat(offer.offerPrice).toFixed(2)}</Text>
                  <Text style={styles.offerMessage}>{offer.offerMessage || 'No message provided.'}</Text>
                  {offer.status === 'accepted' && (
                    <Text style={styles.acceptedLabel}>Offer Accepted</Text>
                  )}
                  {offer.status === 'cancelled' && (
                    <Text style={styles.cancelledLabel}>Offer Cancelled</Text>
                  )}
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
          <View style={styles.actionButtons}>
            {!isTaskOwner && (taskStatus === 'open' || taskStatus === 'offered') && renderApplySection()}
            {task.status === 'active' && isTaskOwner && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.completeButton]}
                onPress={handleMarkComplete}
              >
                <Text style={styles.buttonText}>Mark as Complete</Text>
              </TouchableOpacity>
            )}

            {(task.status === 'active' || task.status === 'completed') && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.chatButton]}
                onPress={() => onViewChat(task.chatId)}
              >
                <Icon name="comments" size={20} color="#fff" />
                <Text style={styles.buttonText}> Chat</Text>
              </TouchableOpacity>
            )}

            {task.status === 'active' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => onCancelTask(task.chatId)}
              >
                <Text style={styles.buttonText}>Cancel Task</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Review Section */}
          {task.status === 'completed' && !hasSubmittedReview && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewTitle}>Leave a Review</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Write your review..."
                value={review}
                onChangeText={setReview}
                multiline
              />
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => setRating(star)}
                  >
                    <Text style={styles.star}>
                      {star <= rating ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={submitReview}
              >
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );


function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
}

  return (
    <>
      {collapsedContent}
      {expandedContent}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    color: '#666',
    fontSize: 14,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: Dimensions.get('window').height * 0.9,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  closeButton: {
    padding: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 15,
  },
  requesterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  requesterName: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  actionButtons: {
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  completeButton: {
    backgroundColor: '#28a745',
  },
  chatButton: {
    backgroundColor: '#007bff',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  reviewSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  reviewInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    height: 100,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  star: {
    fontSize: 30,
    color: '#ffd700',
    marginHorizontal: 5,
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#ff4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#3717ce',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10
},
applyButtonText: {
    color: 'white',
    fontWeight: '600'
},
appliedText: {
    color: '#28a745',
    marginVertical: 10,
    fontWeight: '600'
},
taskerContainer: {
  marginTop: 15,
  padding: 10,
  backgroundColor: '#f8f9fa',
  borderRadius: 8,
},
taskerAssignedText: {
  fontSize: 14,
  color: '#666',
  marginBottom: 8,
},
taskerProfileContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},
taskerProfilePhoto: {
  width: 40,
  height: 40,
  borderRadius: 20,
  marginRight: 10,
},
taskerName: {
  fontSize: 16,
  fontWeight: '500',
  color: '#333',
},
offerItem: {
  backgroundColor: '#f8f9fa',
  borderRadius: 8,
  padding: 12,
  marginBottom: 10,
},
offerHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
},
offerProfilePhoto: {
  width: 40,
  height: 40,
  borderRadius: 20,
  marginRight: 10,
},
offerTaskerInfo: {
  flex: 1,
},
offerTaskerName: {
  fontSize: 16,
  fontWeight: '500',
},
averageRating: {
  marginLeft: 5,
  color: '#666',
},
offerPrice: {
  fontSize: 16,
  fontWeight: '600',
  color: '#28a745',
  marginVertical: 8,
},
offerMessage: {
  fontSize: 14,
  color: '#666',
  marginBottom: 8,
},
acceptedLabel: {
  color: '#28a745',
  fontWeight: '500',
},
cancelledLabel: {
  color: '#dc3545',
  fontWeight: '500',
},
acceptOfferButton: {
  backgroundColor: '#3717ce',
  padding: 8,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 8,
},
acceptOfferButtonText: {
  color: '#fff',
  fontWeight: '500',
},
});

export default ExpandableTaskPost;