import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, ArrowLeft, XCircle, RotateCcw, AlertTriangle, CheckCircle, Truck, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { io } from 'socket.io-client';
import { useCallback } from 'react';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '').replace('http', 'ws') || 'ws://localhost:5000';

const OrderDetail = () => {
  const { id } = useParams();
  // const navigate = useNavigate(); // Not used
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    // Socket.io for real-time order status updates
    const socket = io(SOCKET_URL);
    socket.on('orderStatusUpdated', ({ orderId, status }) => {
      setOrder((prev) => prev && prev.id === orderId ? { ...prev, status } : prev);
    });
    return () => {
      socket.disconnect();
    };
  }, [fetchOrder]);



  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800';
      case 'SHIPPED': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'REFUNDED': return 'bg-green-50 text-green-700 border border-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'PROCESSING':
        return <RotateCcw className="h-5 w-5 text-blue-500" />;
      case 'SHIPPED':
        return <Truck className="h-5 w-5 text-purple-500" />;
      case 'DELIVERED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'REFUNDED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !['PENDING', 'PROCESSING'].includes(order.status)) return;

    setCancelling(true);
    try {
      await api.put(`/orders/${id}/status`, { status: 'CANCELLED' });
      setOrder(prev => ({
        ...prev,
        status: 'CANCELLED'
      }));
      setShowCancelConfirm(false);
      toast.success('Order has been cancelled successfully');
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const canCancelOrder = order && (['PENDING', 'PROCESSING'].includes(order.status));
  const canReturnOrder = order && (['DELIVERED'].includes(order.status) && order.paymentStatus === 'PAID');
  const canTrackOrder = order && (['SHIPPED', 'DELIVERED'].includes(order.status));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order not found</h2>
          <p className="text-gray-600">The order you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Extract shipping and billing addresses from addresses array
  const shippingAddress = order.addresses?.find(addr => addr.type === 'SHIPPING');
  const billingAddress = order.addresses?.find(addr => addr.type === 'BILLING');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/orders"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Order #{order.id.slice(-8)}
                  </h2>
                  <p className="text-gray-600">
                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </span>
                  {(order.paymentStatus === 'REFUNDED' || order.paymentStatus === 'PARTIALLY_REFUNDED') && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      {order.paymentStatus === 'PARTIALLY_REFUNDED' ? 'Partially Refunded' : 'Refunded'}
                    </span>
                  )}
                </div>
              </div>

              {/* Order Actions */}
              <div className="flex flex-wrap gap-3 mt-4">
                {canCancelOrder && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-2"
                    disabled={cancelling}
                  >
                    <XCircle className="h-4 w-4" />
                    {cancelling ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
                {canReturnOrder && (
                  <Link
                    to={`/returns/new?orderId=${order.id}`}
                    className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Request Return
                  </Link>
                )}
                {canTrackOrder && order.trackingNumber && (
                  <a
                    href={`https://www.fedex.com/fedextrack/?tracknumbers=${order.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg flex items-center gap-2"
                  >
                    <Truck className="h-4 w-4" />
                    Track Package
                  </a>
                )}
              </div>

              {/* Order Items */}
              <div className="space-y-4 mt-6">
                <h3 className="font-semibold text-gray-900">Items</h3>
                {order.orderItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                      <p className="text-sm text-gray-600">SKU: {item.product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${item.price}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
              </div>
              <div className="space-y-2 text-gray-700">
                <p>{shippingAddress?.firstName} {shippingAddress?.lastName}</p>
                <p>{shippingAddress?.street}</p>
                <p>{shippingAddress?.city}, {shippingAddress?.state} {shippingAddress?.zipCode}</p>
                <p>{shippingAddress?.country}</p>
              </div>
            </div>

            {/* Billing Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Billing Address</h3>
              </div>
              <div className="space-y-2 text-gray-700">
                <p>{billingAddress?.firstName} {billingAddress?.lastName}</p>
                <p>{billingAddress?.street}</p>
                <p>{billingAddress?.city}, {billingAddress?.state} {billingAddress?.zipCode}</p>
                <p>{billingAddress?.country}</p>
              </div>
            </div>

            {/* Order Notes */}
            {order.notes && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Notes</h3>
                <p className="text-gray-700">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h3>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${order.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">${order.tax}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">${order.shipping}</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-blue-600">${order.total}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Payment Status</h4>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.paymentStatus}
                </span>
              </div>

              {/* Order Timeline */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-4">Order Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Order Placed</p>
                      <p className="text-xs text-gray-600">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {order.status !== 'PENDING' && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Processing</p>
                        <p className="text-xs text-gray-600">Order confirmed and being prepared</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cancel Order</h3>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={cancelling}
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;