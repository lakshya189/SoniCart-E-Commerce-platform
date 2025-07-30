import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const NotificationContext = createContext();

const initialState = {
  notifications: [],
  inventoryAlerts: [],
  unreadCount: 0,
  loading: false,
  error: null,
  preferences: null,
};

const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload, loading: false };
    case 'SET_INVENTORY_ALERTS':
      return { ...state, inventoryAlerts: action.payload, loading: false };
    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };
    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload ? { ...notification, isRead: true } : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification => ({ ...notification, isRead: true })),
        unreadCount: 0,
      };
    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(notification => notification.id !== action.payload),
      };
    case 'ADD_INVENTORY_ALERT':
      return {
        ...state,
        inventoryAlerts: [action.payload, ...state.inventoryAlerts],
      };
    case 'DELETE_INVENTORY_ALERT':
      return {
        ...state,
        inventoryAlerts: state.inventoryAlerts.filter(alert => alert.id !== action.payload),
      };
    default:
      return state;
  }
};

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user } = useAuth();

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.get('/notifications');
      dispatch({ type: 'SET_NOTIFICATIONS', payload: response.data.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, [user]);

  // Load inventory alerts
  const loadInventoryAlerts = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get('/inventory/alerts');
      dispatch({ type: 'SET_INVENTORY_ALERTS', payload: response.data.data });
    } catch (error) {
      console.error('Error loading inventory alerts:', error);
    }
  }, [user]);

  // Load notification preferences
  const loadPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get('/notifications/preferences');
      dispatch({ type: 'SET_PREFERENCES', payload: response.data.data });
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, [user]);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get('/notifications/unread-count');
      dispatch({ type: 'SET_UNREAD_COUNT', payload: response.data.data.count });
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      dispatch({ type: 'MARK_AS_READ', payload: notificationId });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      dispatch({ type: 'MARK_ALL_AS_READ' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      dispatch({ type: 'DELETE_NOTIFICATION', payload: notificationId });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Create inventory alert
  const createInventoryAlert = useCallback(async (productId, type, threshold) => {
    try {
      const response = await api.post('/inventory/alerts', {
        productId,
        type,
        threshold,
      });
      dispatch({ type: 'ADD_INVENTORY_ALERT', payload: response.data.data });
      return response.data;
    } catch (error) {
      console.error('Error creating inventory alert:', error);
      throw error;
    }
  }, []);

  // Delete inventory alert
  const deleteInventoryAlert = useCallback(async (alertId) => {
    try {
      await api.delete(`/inventory/alerts/${alertId}`);
      dispatch({ type: 'DELETE_INVENTORY_ALERT', payload: alertId });
    } catch (error) {
      console.error('Error deleting inventory alert:', error);
    }
  }, []);

  // Update notification preferences
  const updatePreferences = useCallback(async (preferences) => {
    try {
      const response = await api.put('/notifications/preferences', preferences);
      dispatch({ type: 'SET_PREFERENCES', payload: response.data.data });
      return response.data;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }, []);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadNotifications();
      loadInventoryAlerts();
      loadPreferences();
      loadUnreadCount();
    } else {
      dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
      dispatch({ type: 'SET_INVENTORY_ALERTS', payload: [] });
      dispatch({ type: 'SET_PREFERENCES', payload: null });
      dispatch({ type: 'SET_UNREAD_COUNT', payload: 0 });
    }
  }, [user, loadNotifications, loadInventoryAlerts, loadPreferences, loadUnreadCount]);

  // Refresh unread count periodically
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(loadUnreadCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [user, loadUnreadCount]);

  const value = {
    ...state,
    loadNotifications,
    loadInventoryAlerts,
    loadPreferences,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createInventoryAlert,
    deleteInventoryAlert,
    updatePreferences,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 