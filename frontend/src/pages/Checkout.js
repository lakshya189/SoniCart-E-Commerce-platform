import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Truck, CheckCircle, ArrowLeft } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
// eslint-disable-next-line no-unused-vars
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
// Google Maps and PayPal imports removed as they're not being used

const Checkout = () => {
  const navigate = useNavigate();
  const { items: cartItems = [], clearCart } = useCart();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    shipping: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: '',
      street: '', // changed from address to street
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    billing: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      street: '', // changed from address to street
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    sameAsShipping: true
  });

  // Defensive calculation for summary
  const subtotal = cartItems.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;
    return sum + (price * quantity);
  }, 0);
  const tax = subtotal * 0.1;
  const shipping = subtotal > 100 ? 0 : 10;
  const total = subtotal + tax + shipping;

  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [shippingErrors, setShippingErrors] = useState({});
  const [billingErrors, setBillingErrors] = useState({});
  const [apiError, setApiError] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [paymentMethod, setPaymentMethod] = useState('card'); // Only 'card' and 'cod'

  // Payment request functionality removed as it's not being used

  // Remove all useJsApiLoader, Autocomplete, and Google Maps API key logic
  // Use plain input for shipping address:
  // Remove the following (if present):
  // - const [shippingAutocomplete, setShippingAutocomplete] = useState(null);
  // - const [billingAutocomplete, setBillingAutocomplete] = useState(null);
  // - const handleShippingPlaceChanged = () => { ... }
  // - const handleBillingPlaceChanged = () => { ... }

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems, navigate]);

  useEffect(() => {
    if (step === 2 && !clientSecret && cartItems.length > 0 && paymentMethod !== 'cod') {
      // Fetch payment intent when entering payment step
      const fetchPaymentIntent = async () => {
        try {
          setLoading(true);
          if (isNaN(total) || total < 0.5) {
            setPaymentError('Invalid order total.');
            setLoading(false);
            return;
          }
          const res = await api.post('/payments/create-payment-intent', {
            amount: total,
            currency: 'usd',
          });
          setClientSecret(res.data.data.clientSecret);
        } catch (err) {
          setPaymentError('Failed to initialize payment. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      fetchPaymentIntent();
    }
    // eslint-disable-next-line
  }, [step, cartItems, total, paymentMethod]);



  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    if (section === 'shipping') setShippingErrors(prev => ({ ...prev, [field]: '' }));
    if (section === 'billing') setBillingErrors(prev => ({ ...prev, [field]: '' }));
    setApiError('');
    setPaymentError('');
  };

  const handleSameAsShippingChange = (checked) => {
    setFormData(prev => ({
      ...prev,
      sameAsShipping: checked,
      billing: checked ? prev.shipping : prev.billing
    }));
  };

  const validateShipping = () => {
    const { shipping } = formData;
    const errs = {};
    if (!shipping.firstName) errs.firstName = 'First name is required';
    if (!shipping.lastName) errs.lastName = 'Last name is required';
    if (!shipping.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(shipping.email)) errs.email = 'Email is invalid';
    if (!shipping.street) errs.street = 'Address is required';
    if (!shipping.city) errs.city = 'City is required';
    if (!shipping.state) errs.state = 'State is required';
    if (!shipping.zipCode) errs.zipCode = 'ZIP code is required';
    setShippingErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const validateBilling = () => {
    const { billing } = formData;
    const errs = {};
    if (!billing.firstName) errs.firstName = 'First name is required';
    if (!billing.lastName) errs.lastName = 'Last name is required';
    if (!billing.street) errs.street = 'Address is required';
    if (!billing.city) errs.city = 'City is required';
    if (!billing.state) errs.state = 'State is required';
    if (!billing.zipCode) errs.zipCode = 'ZIP code is required';
    setBillingErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    setApiError('');
    if (validateShipping()) {
      setStep(2);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPaymentError('');
    setApiError('');
    try {
      if (paymentMethod === 'cod') {
        // Place order as COD
        const orderData = {
          shippingAddress: formData.shipping,
          billingAddress: formData.sameAsShipping ? formData.shipping : formData.billing,
          paymentMethod: 'cod', // ensure lowercase
        };
        const response = await api.post('/orders', orderData);
        clearCart();
        navigate(`/orders/${response.data.data.id}`);
        setLoading(false);
        return;
      }
      if (paymentMethod === 'card') {
        if (!stripe || !elements) {
          setPaymentError('Stripe is not loaded.');
          setLoading(false);
          return;
        }
        if (!clientSecret) {
          setPaymentError('Payment not initialized.');
          setLoading(false);
          return;
        }
        if (!formData.sameAsShipping && !validateBilling()) {
          setLoading(false);
          return;
        }
        // Confirm card payment
        const cardElement = elements.getElement(CardElement);
        const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${formData.billing.firstName} ${formData.billing.lastName}`,
              email: formData.shipping.email,
              address: {
                line1: formData.billing.street,
                city: formData.billing.city,
                state: formData.billing.state,
                postal_code: formData.billing.zipCode,
                country: formData.billing.country,
              },
            },
          },
        });
        if (error) {
          setPaymentError(error.message || 'Payment failed.');
          toast.error(error.message || 'Payment failed.');
          setLoading(false);
          return;
        }
        if (paymentIntent.status !== 'succeeded') {
          setPaymentError('Payment was not successful.');
          toast.error('Payment was not successful.');
          setLoading(false);
          return;
        }
        setPaymentSuccess(true);
        // Create order
        const orderData = {
          shippingAddress: formData.shipping,
          billingAddress: formData.sameAsShipping ? formData.shipping : formData.billing,
          paymentIntentId: paymentIntent.id,
          paymentMethod: 'card',
        };
        const response = await api.post('/orders', orderData);
        clearCart();
        navigate(`/orders/${response.data.data.id}`);
      }
    } catch (error) {
      setPaymentError('Error processing payment or creating order.');
      setApiError('Error processing payment or creating order.');
      toast.error('Error processing payment or creating order.');
      setLoading(false);
    }
    setLoading(false);
  };

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>Checkout - SonicArt</title>
        <meta name="description" content="Complete your purchase securely at SonicArt. Enter your shipping and payment details to place your order." />
        <meta property="og:title" content="Checkout - SonicArt" />
        <meta property="og:description" content="Complete your purchase securely at SonicArt. Enter your shipping and payment details to place your order." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://yourdomain.com/checkout" />
        <meta property="og:image" content="/logo192.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Checkout - SonicArt" />
        <meta name="twitter:description" content="Complete your purchase securely at SonicArt. Enter your shipping and payment details to place your order." />
        <meta name="twitter:image" content="/logo192.png" />
        <link rel="canonical" href="https://yourdomain.com/checkout" />
      </Helmet>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/cart')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step >= 1 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-500'
            }`}>
              {step > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
            </div>
            <div className={`w-16 h-1 ${step > 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step >= 2 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-500'
            }`}>
              {step > 2 ? <CheckCircle className="h-5 w-5" /> : '2'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-lg shadow-sm p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Truck className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Shipping Information</h2>
                </div>

                <form onSubmit={handleShippingSubmit} className="space-y-6">
                  {apiError && <div className="mb-2 text-red-600 text-center text-sm font-medium">{apiError}</div>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={formData.shipping.firstName}
                        onChange={(e) => handleInputChange('shipping', 'firstName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {shippingErrors.firstName && <p className="mt-1 text-sm text-red-600">{shippingErrors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={formData.shipping.lastName}
                        onChange={(e) => handleInputChange('shipping', 'lastName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {shippingErrors.lastName && <p className="mt-1 text-sm text-red-600">{shippingErrors.lastName}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.shipping.email}
                        onChange={(e) => handleInputChange('shipping', 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {shippingErrors.email && <p className="mt-1 text-sm text-red-600">{shippingErrors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.shipping.phone}
                        onChange={(e) => handleInputChange('shipping', 'phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    {/* Remove Google Maps API key check */}
                    {/* {process.env.REACT_APP_GOOGLE_MAPS_API_KEY && (
                      <div className="text-red-600 text-sm mb-2">Google Maps API key is missing. Please set REACT_APP_GOOGLE_MAPS_API_KEY in your .env file.</div>
                    )} */}
                    {/* {googleLoadError && (
                      <div className="text-red-600 text-sm mb-2">Failed to load Google Maps: {googleLoadError.message}</div>
                    )} */}
                    {/* Use plain input for shipping address */}
                    <input
                      type="text"
                      value={formData.shipping.street}
                      onChange={(e) => handleInputChange('shipping', 'street', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="Start typing your address..."
                    />
                    {shippingErrors.street && <p className="mt-1 text-sm text-red-600">{shippingErrors.street}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.shipping.city}
                        onChange={(e) => handleInputChange('shipping', 'city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {shippingErrors.city && <p className="mt-1 text-sm text-red-600">{shippingErrors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        value={formData.shipping.state}
                        onChange={(e) => handleInputChange('shipping', 'state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {shippingErrors.state && <p className="mt-1 text-sm text-red-600">{shippingErrors.state}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        value={formData.shipping.zipCode}
                        onChange={(e) => handleInputChange('shipping', 'zipCode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {shippingErrors.zipCode && <p className="mt-1 text-sm text-red-600">{shippingErrors.zipCode}</p>}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
                    >
                      Continue to Payment
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-lg shadow-sm p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Payment Information</h2>
                </div>
                {/* Payment Method Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Payment Method</label>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setPaymentMethod('card')} className={`px-4 py-2 rounded border ${paymentMethod==='card'?'border-blue-600 bg-blue-50':'border-gray-300'}`}>Card</button>
                    <button type="button" onClick={() => setPaymentMethod('cod')} className={`px-4 py-2 rounded border ${paymentMethod==='cod'?'border-blue-600 bg-blue-50':'border-gray-300'}`}>Cash on Delivery</button>
                  </div>
                </div>
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  {/* Billing Address */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="sameAsShipping"
                        checked={formData.sameAsShipping}
                        onChange={(e) => handleSameAsShippingChange(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="sameAsShipping" className="text-sm font-medium text-gray-700">
                        Billing address same as shipping
                      </label>
                    </div>

                    {!formData.sameAsShipping && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium text-gray-900">Billing Address</h3>
                        {apiError && <div className="mb-2 text-red-600 text-center text-sm font-medium">{apiError}</div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              First Name
                            </label>
                            <input
                              type="text"
                              value={formData.billing.firstName}
                              onChange={(e) => handleInputChange('billing', 'firstName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {billingErrors.firstName && <p className="mt-1 text-sm text-red-600">{billingErrors.firstName}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Last Name
                            </label>
                            <input
                              type="text"
                              value={formData.billing.lastName}
                              onChange={(e) => handleInputChange('billing', 'lastName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {billingErrors.lastName && <p className="mt-1 text-sm text-red-600">{billingErrors.lastName}</p>}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Address
                          </label>
                          {/* Use plain input for billing address */}
                          <input
                            type="text"
                            value={formData.billing.street}
                            onChange={(e) => handleInputChange('billing', 'street', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Billing address"
                          />
                          {billingErrors.street && <p className="mt-1 text-sm text-red-600">{billingErrors.street}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              City
                            </label>
                            <input
                              type="text"
                              value={formData.billing.city}
                              onChange={(e) => handleInputChange('billing', 'city', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {billingErrors.city && <p className="mt-1 text-sm text-red-600">{billingErrors.city}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              State
                            </label>
                            <input
                              type="text"
                              value={formData.billing.state}
                              onChange={(e) => handleInputChange('billing', 'state', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {billingErrors.state && <p className="mt-1 text-sm text-red-600">{billingErrors.state}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              ZIP Code
                            </label>
                            <input
                              type="text"
                              value={formData.billing.zipCode}
                              onChange={(e) => handleInputChange('billing', 'zipCode', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {billingErrors.zipCode && <p className="mt-1 text-sm text-red-600">{billingErrors.zipCode}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Method UI */}
                  {paymentMethod === 'card' && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <CardElement options={{ hidePostalCode: true }} className="p-2 border rounded" />
                    </div>
                  )}
                  {paymentMethod === 'cod' && (
                    <div className="p-4 bg-yellow-50 rounded-lg text-center">
                      <p className="text-yellow-700 font-medium">You will pay with cash upon delivery.</p>
                    </div>
                  )}
                  {paymentError && <div className="text-red-600 text-sm">{paymentError}</div>}
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Back to Shipping
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading || (paymentMethod==='card' && (!stripe || !elements))}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processing...' : paymentMethod==='cod' ? 'Place Order' : 'Pay & Place Order'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">Qty: {Number(item.quantity) || 0}</p>
                    </div>
                    <span className="font-medium">${(Number(item.price) || 0) * (Number(item.quantity) || 0)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (10%)</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-blue-600">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout; 