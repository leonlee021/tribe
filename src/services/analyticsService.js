// src/services/analyticsService.js
import PostHog from 'posthog-react-native'

const POSTHOG_API_KEY = 'phc_YOUR_KEY'; // Get this from PostHog dashboard
const POSTHOG_HOST = 'https://app.posthog.com'; // Or your self-hosted URL

const Analytics = {
  initialize: async () => {
    try {
      await PostHog.setup(POSTHOG_API_KEY, {
        host: POSTHOG_HOST,
      });
      console.log('PostHog initialized successfully');
    } catch (error) {
      console.error('Analytics initialization error:', error);
    }
  },

  trackScreen: (screenName) => {
    try {
      PostHog.screen(screenName, {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  },

  trackEvent: (eventName, properties = {}) => {
    try {
      PostHog.capture(eventName, {
        ...properties,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  },

  identifyUser: (userId, userProperties = {}) => {
    try {
      PostHog.identify(userId, {
        ...userProperties,
        last_login: new Date().toISOString()
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }
};

export const EVENTS = {
  // Task Events
  TASK_CREATED: 'Task Created',
  TASK_VIEWED: 'Task Viewed',
  OFFER_SUBMITTED: 'Offer Submitted',
  OFFER_ACCEPTED: 'Offer Accepted',
  TASK_DELETED: 'Task Deleted',
  
  // User Events
  PROFILE_VIEWED: 'Profile Viewed',
  PROFILE_UPDATED: 'Profile Updated',
  
  // Chat Events
  CHAT_OPENED: 'Chat Opened',
  MESSAGE_SENT: 'Message Sent',
  
  // Payment Events
  CARD_ADDED: 'Card Added'
};

export default Analytics;