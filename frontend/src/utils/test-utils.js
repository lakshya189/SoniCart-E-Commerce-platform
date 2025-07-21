import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Mock Stripe
const stripePromise = Promise.resolve({
  createToken: jest.fn(),
  createSource: jest.fn(),
  createPaymentMethod: jest.fn(),
  confirmCardPayment: jest.fn(),
  confirmPaymentIntent: jest.fn(),
});

// Create a new QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

// Custom render function that includes all providers
const AllTheProviders = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Elements stripe={stripePromise}>
          {children}
          <Toaster />
        </Elements>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function
const customRender = (ui, options = {}) => {
  const Wrapper = ({ children }) => (
    <AllTheProviders {...options.wrapperProps}>
      {children}
    </AllTheProviders>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Mock API responses
export const mockApiResponses = {
  products: {
    data: [
      {
        id: '1',
        name: 'Test Product 1',
        description: 'Test description 1',
        price: 29.99,
        images: ['https://example.com/image1.jpg'],
        categoryId: '1',
        stock: 10,
        isActive: true,
      },
      {
        id: '2',
        name: 'Test Product 2',
        description: 'Test description 2',
        price: 49.99,
        images: ['https://example.com/image2.jpg'],
        categoryId: '1',
        stock: 5,
        isActive: true,
      },
    ],
  },
  categories: {
    data: [
      {
        id: '1',
        name: 'Electronics',
        description: 'Electronic products',
        slug: 'electronics',
        image: '/images/category-placeholder.jpg',
      },
    ],
  },
  user: {
    data: {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
    },
  },
  auth: {
    data: {
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
      },
      token: 'test-token',
    },
  },
};

// Mock API functions
export const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

// Test data helpers
export const createTestProduct = (overrides = {}) => ({
  id: '1',
  name: 'Test Product',
  description: 'Test description',
  price: 29.99,
  images: ['https://example.com/image.jpg'],
  categoryId: '1',
  stock: 10,
  isActive: true,
  ...overrides,
});

export const createTestUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  ...overrides,
});

export const createTestCategory = (overrides = {}) => ({
  id: '1',
  name: 'Electronics',
  description: 'Electronic products',
  slug: 'electronics',
  image: '/images/category-placeholder.jpg',
  ...overrides,
});

// Re-export everything
export * from '@testing-library/react';
export { customRender as render }; 