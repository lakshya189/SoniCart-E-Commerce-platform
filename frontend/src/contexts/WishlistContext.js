import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const WishlistContext = createContext();

const initialState = {
  items: [],
  loading: false,
  error: null,
  isInitialized: false,
};

const wishlistReducer = (state, action) => {
  switch (action.type) {
    case 'SET_WISHLIST':
      return {
        ...state,
        items: action.payload,
        loading: false,
        error: null,
        isInitialized: true,
      };
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.payload],
        loading: false,
        error: null,
      };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.productId !== action.payload),
        loading: false,
        error: null,
      };
    case 'CLEAR_WISHLIST':
      return {
        ...state,
        items: [],
        loading: false,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case 'OPTIMISTIC_ADD':
      return {
        ...state,
        items: [...state.items, action.payload],
      };
    case 'OPTIMISTIC_REMOVE':
      return {
        ...state,
        items: state.items.filter(item => item.productId !== action.payload),
      };
    default:
      return state;
  }
};

export const WishlistProvider = ({ children }) => {
  const [state, dispatch] = useReducer(wishlistReducer, initialState);
  const { isAuthenticated } = useAuth();

  // Load wishlist on mount and when user authenticates
  useEffect(() => {
    if (isAuthenticated && !state.isInitialized) {
      loadWishlist();
    }
  }, [isAuthenticated, state.isInitialized]);

  // Load wishlist from API
  const loadWishlist = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.get('/wishlist');
      if (response.data && response.data.success) {
        dispatch({ type: 'SET_WISHLIST', payload: response.data.data });
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load wishlist' });
    }
  }, []);

  // Add item to wishlist with optimistic update
  const addToWishlist = useCallback(async (productId) => {
    // Create optimistic item
    const optimisticItem = {
      id: `temp-${Date.now()}`,
      productId,
      userId: 'temp',
      createdAt: new Date().toISOString(),
      product: {
        id: productId,
        name: 'Loading...',
        price: 0,
        images: [],
        category: { id: '', name: '', slug: '' },
      },
    };

    // Optimistic update
    dispatch({ type: 'OPTIMISTIC_ADD', payload: optimisticItem });

    try {
      const response = await api.post('/wishlist', { productId });
      if (response.data && response.data.success) {
        // Replace optimistic item with real data
        dispatch({ type: 'REMOVE_ITEM', payload: productId });
        dispatch({ type: 'ADD_ITEM', payload: response.data.data });
        toast.success('Added to wishlist');
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      // Revert optimistic update on error
      dispatch({ type: 'OPTIMISTIC_REMOVE', payload: productId });
      const message = error.response?.data?.message || 'Failed to add to wishlist';
      toast.error(message);
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  }, []);

  // Remove item from wishlist with optimistic update
  const removeFromWishlist = useCallback(async (productId) => {
    // Optimistic update
    dispatch({ type: 'OPTIMISTIC_REMOVE', payload: productId });

    try {
      await api.delete(`/wishlist/${productId}`);
      dispatch({ type: 'REMOVE_ITEM', payload: productId });
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      // Revert optimistic update on error
      dispatch({ type: 'ADD_ITEM', payload: state.items.find(item => item.productId === productId) });
      const message = error.response?.data?.message || 'Failed to remove from wishlist';
      toast.error(message);
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  }, [state.items]);

  // Clear entire wishlist
  const clearWishlist = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await api.delete('/wishlist');
      dispatch({ type: 'CLEAR_WISHLIST' });
      toast.success('Wishlist cleared');
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      const message = error.response?.data?.message || 'Failed to clear wishlist';
      toast.error(message);
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  }, []);

  // Move item from wishlist to cart
  const moveToCart = useCallback(async (productId, quantity = 1) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await api.post(`/wishlist/${productId}/move-to-cart`, { quantity });
      dispatch({ type: 'REMOVE_ITEM', payload: productId });
      toast.success('Moved to cart');
    } catch (error) {
      console.error('Error moving to cart:', error);
      const message = error.response?.data?.message || 'Failed to move to cart';
      toast.error(message);
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  }, []);

  // Check if product is in wishlist
  const isInWishlist = useCallback((productId) => {
    return state.items.some(item => item.productId === productId);
  }, [state.items]);

  // Get wishlist item count
  const getWishlistCount = useCallback(() => {
    return state.items.length;
  }, [state.items]);

  // Toggle wishlist item (add if not in wishlist, remove if in wishlist)
  const toggleWishlist = useCallback(async (productId) => {
    if (isInWishlist(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  }, [isInWishlist, removeFromWishlist, addToWishlist]);

  const value = {
    items: state.items,
    loading: state.loading,
    error: state.error,
    isInitialized: state.isInitialized,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    moveToCart,
    isInWishlist,
    getWishlistCount,
    toggleWishlist,
    loadWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}; 