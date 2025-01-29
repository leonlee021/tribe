import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import ExpandableTaskPost from './ExpandableTaskPost';
import Icon from 'react-native-vector-icons/FontAwesome';
import OfferModal from '../../components/OfferModal';

const ProfileTaskPost = ({ 
    task, 
    loggedInUserId,
    onHide = () => {},
    onMarkComplete = () => {},
    onCancelTask = () => {},
    onViewChat = () => {},
    onViewProfile = () => {},
    onAcceptOffer = () => {},
    onDeleteTask = () => {},
    notificationCount = 0,
    hasSubmittedReview = false,
    initialCollapsed = true,
    onSubmitOffer = () => {},
    isTaskOwner,
    taskStatus,
}) => {
    const [isExpanded, setIsExpanded] = useState(!initialCollapsed);
    const navigation = useNavigation();
    const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);

    // Check if user has applied
    const userHasApplied = task.offers?.some(offer => 
        String(offer.taskerId) === String(loggedInUserId)
    );

    useEffect(() => {

        console.log({
            task,
        //   offers,
        //   loggedInUserId,
        //   userHasApplied,
        //   isTaskOwner,
        //   taskStatus
        });
      }, [loggedInUserId, userHasApplied, isTaskOwner, taskStatus]);    



    const renderStatusBadge = (status) => {
        const statusColors = {
        open: '#28a745',
        active: '#007bff',
        completed: '#6c757d',
        };

    return (
      <View style={[styles.statusBadge, { backgroundColor: statusColors[status] || '#6c757d' }]}>
        <Text style={styles.statusText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
      </View>
    );
  };

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

  const formattedDate = formatDate(task.createdAt);

  if (isExpanded) {
    return (
      <ExpandableTaskPost
        task={task}
        loggedInUserId={loggedInUserId}
        onHide={onHide}
        onMarkComplete={onMarkComplete}
        onCancelTask={onCancelTask}
        onViewChat={onViewChat}
        onViewProfile={onViewProfile}
        onAcceptOffer={onAcceptOffer}
        onDeleteTask={onDeleteTask}
        notificationCount={notificationCount}
        hasSubmittedReview={hasSubmittedReview}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        onSubmitOffer={onSubmitOffer}
        isTaskOwner={isTaskOwner}
        taskStatus={taskStatus}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Main content wrapped in its own Touchable */}
      <View style={styles.contentWrapper}>
        <TouchableOpacity 
            onPress={() => setIsExpanded(true)}
            activeOpacity={0.7}
        >
        <View style={styles.headerRow}>
          <View style={styles.leftHeader}>
            {renderStatusBadge(task.status)}
            {/* Use static date formatting */}
            <Text style={styles.date}>{formattedDate}</Text>
          </View>
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount}</Text>
            </View>
          )}
        </View>
  
        <Text style={styles.description} numberOfLines={2}>
          {task.description}
        </Text>
  
        <View style={styles.footer}>
          <View style={styles.leftFooter}>
            <Text style={styles.price}>${task.price}</Text>
          </View>
          <Icon name="chevron-down" size={14} color="#666" />
        </View>
        </TouchableOpacity>
        </View>
      {/* Accept button outside the main touchable */}
      {!isTaskOwner && taskStatus === 'open' && (
        <View style={styles.buttonContainer}>
          {!userHasApplied ? (
            <TouchableOpacity 
              style={styles.acceptButton}
              onPress={() => setIsOfferModalVisible(true)}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.appliedText}>Applied</Text>
          )}
        </View>
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
    </View>
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
    position: 'relative', 
    overflow: 'visible'
  },
  contentWrapper: {
    flex: 1,
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
  contentContainer: {
    marginBottom: 10,
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
  taskerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskerLabel: {
    fontSize: 14,
    color: '#666',
  },
  taskerName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  archiveButton: {
    padding: 8,
  },
  expandButton: {
    padding: 8,
  },
  leftFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
 },
 buttonContainer: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    zIndex: 2,
  },
acceptButton: {
    backgroundColor: '#3717ce',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 15,
},
acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
},
appliedText: {
    color: '#28a745',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
},
});

export default ProfileTaskPost;
