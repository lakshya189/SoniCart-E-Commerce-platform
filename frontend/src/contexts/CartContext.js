import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const CartContext = createContext();

const initialState = {
  items: [],
  summary: {
    subtotal: 0,
    tax: 0,
    shipping: 0,
    total: 0,
  },
  loading: false,
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CART':
      return {
        ...state,
        items: action.payload.items,
        summary: action.payload.summary,
        loading: false,
      };
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.payload],
        loading: false,
      };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id ? action.payload : item
        ),
        loading: false,
      };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
        loading: false,
      };
    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        summary: {
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0,
        },
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { isAuthenticated } = useAuth();

  // Load cart on mount and when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      loadCart();
    }
  }, [isAuthenticated]);

  // Load cart from API
  const loadCart = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.get('/cart');
      if (response.data && response.data.success) {
        // Defensive: ensure all items have valid price and quantity
        const items = (response.data.data.items || []).map(item => ({
          ...item,
          price: Number(item.product?.price) || 0,
          name: item.product?.name || '',
          image: item.product?.images?.[0] || '',
          sku: item.product?.sku || '',
          quantity: Number(item.quantity) || 0,
        }));
        // Recalculate summary on frontend
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.1;
        const shipping = subtotal > 100 ? 0 : 10;
        const total = subtotal + tax + shipping;
        dispatch({ 
          type: 'SET_CART', 
          payload: {
            items,
            summary: { subtotal, tax, shipping, total },
          }
        });
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      toast.error('Failed to load cart. Please try again.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Add item to cart
  const addToCart = async (productId, quantity = 1) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await api.post('/cart', { productId, quantity });
      await loadCart(); // Always reload cart after add
      toast.success('Item added to cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      const message = error.response?.data?.message || 'Failed to add item to cart';
      toast.error(message);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Update cart item quantity
  const updateCartItem = async (itemId, quantity) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await api.put(`/cart/${itemId}`, { quantity });
      await loadCart(); // Always reload cart after update
      toast.success('Cart updated successfully');
    } catch (error) {
      console.error('Error updating cart item:', error);
      const message = error.response?.data?.message || 'Failed to update cart item';
      toast.error(message);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Remove item from cart
  const removeFromCart = async (itemId) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await api.delete(`/cart/${itemId}`);
      await loadCart(); // Always reload cart after remove
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Error removing from cart:', error);
      const message = error.response?.data?.message || 'Failed to remove item from cart';
      toast.error(message);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await api.delete('/cart');
      await loadCart(); // Always reload cart after clear
      toast.success('Cart cleared successfully');
    } catch (error) {
      console.error('Error clearing cart:', error);
      const message = error.response?.data?.message || 'Failed to clear cart';
      toast.error(message);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Get cart item count
  const getCartItemCount = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  // Check if product is in cart
  const isInCart = (productId) => {
    return state.items.some(item => item.productId === productId);
  };

  // Get cart item by product ID
  const getCartItem = (productId) => {
    return state.items.find(item => item.productId === productId);
  };

  const value = {
    items: state.items,
    summary: state.summary,
    loading: state.loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    loadCart,
    getCartItemCount,
    isInCart,
    getCartItem,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}; 