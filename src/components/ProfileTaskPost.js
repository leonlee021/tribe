import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');

const renderStars = (rating) => {
    const stars = [];
    const numericRating = parseFloat(rating);
    
    for (let i = 1; i <= 5; i++) {
      let starName = 'star-o'; // Default empty star
      if (i <= numericRating) {
        starName = 'star'; // Full star
      } else if (i - 0.5 <= numericRating) {
        starName = 'star-half-o'; // Half star
      }
      stars.push(
        <Icon 
          key={i} 
          name={starName} 
          size={20} 
          color="#FFD700" 
          style={styles.starIcon} 
        />
      );
    }
    
    return stars;
};

const ProfileTaskPost = ({ task, loggedInUserId, onHide, onUnhide, isOwnProfile, isHiddenTask, profileUser }) => {
  const isTaskOwner = loggedInUserId ? String(task.userId) === String(loggedInUserId) : false;
  const formattedDate = timeSince(task.createdAt);
  const profilePhotoUrl = task.requester && task.requester.profilePhotoUrl ? task.requester.profilePhotoUrl : null;
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);

  const relevantReviews = task.activeChat?.reviews?.filter(review => 
    String(review.reviewedUserId) === String(profileUser?.id)
  ) || [];

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

  return (
    <View style={styles.cardContainer}>
      {/* Task Name at the Top */}
      <Text style={styles.taskName}>{task.taskName}</Text>

      {/* Task Description */}
      <Text style={styles.taskDescription}>{task.postContent}</Text>

      {/* Task Photos */}
      {renderTaskPhotos()}

      {/* Task Details */}
      <View style={styles.taskDetailsContainer}>
        <View style={styles.taskDetail}>
          <Icon name="map-marker" size={16} color="#777" />
          <Text style={styles.taskDetailText} numberOfLines={1} ellipsizeMode="tail">
            {task.location || 'No location set'}
          </Text>
        </View>
        {/* <View style={styles.taskDetail}>
          <Icon name="dollar" size={16} color="#777" />
          <Text style={styles.taskDetailText}>${task.price}</Text>
        </View> */}
        <View style={styles.taskDetail}>
          <Icon name="clock-o" size={16} color="#777" />
          <Text style={styles.taskDetailText}>{formattedDate}</Text>
        </View>
      </View>

      {/* Display Review if available */}
      {relevantReviews.length > 0 ? (
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewTitle}>Review for {profileUser ? `${profileUser.firstName} ${profileUser.lastName}` : 'User'}</Text>
          {relevantReviews.map((review, index) => (
            <View key={index} style={styles.singleReviewContainer}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewText}>{review.review}</Text>
                <View style={styles.reviewRatingContainer}>
                  {renderStars(review.rating)}
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noReviewsText}>No review available for this task.</Text>
      )}

      {/* Hide/Unhide Button */}
      {isOwnProfile && (
        isHiddenTask ? (
          <TouchableOpacity 
            style={styles.hideButton} 
            onPress={() => onUnhide(task.id)}
          >
            <Icon name="eye" size={20} color="#fff" />
            <Text style={styles.hideButtonText}>Unarchive</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.hideButton} 
            onPress={() => onHide(task.id)}
          >
            <Icon name="eye-slash" size={20} color="#fff" />
            <Text style={styles.hideButtonText}>Archive</Text>
          </TouchableOpacity>
        )
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
    </View>
  );
};

// Also, make sure to define or import the `timeSince` function
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

export default ProfileTaskPost;

// Define styles here or import them if they are defined elsewhere
const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  taskName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 16,
    color: '#555',
    marginBottom: 12,
  },
  taskDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taskDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskDetailText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#777',
  },
  reviewContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  singleReviewContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  reviewRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginHorizontal: 2,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 12,
  },
  hideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4d4d',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  hideButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  photoContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    marginVertical: 12,
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
});
