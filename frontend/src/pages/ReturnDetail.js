import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, RotateCcw, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import api from '../utils/api';

const ReturnDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [returnRequest, setReturnRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchReturnRequest();
  }, [id, fetchReturnRequest]);

  const fetchReturnRequest = async () => {
    try {
      const [returnRes, messagesRes] = await Promise.all([
        api.get(`/returns/${id}`),
        api.get(`/returns/${id}/messages`)
      ]);
      
      setReturnRequest(returnRes.data.data);
      setMessages(messagesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching return request:', error);
      setError('Failed to load return request details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReturn = async () => {
    if (!returnRequest || returnRequest.status !== 'PENDING') return;

    setCancelling(true);
    try {
      await api.put(`/returns/${id}/cancel`);
      setReturnRequest(prev => ({
        ...prev,
        status: 'CANCELLED'
      }));
      setShowCancelConfirm(false);
    } catch (error) {
      console.error('Error cancelling return:', error);
      setError('Failed to cancel return request');
    } finally {
      setCancelling(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await api.post(`/returns/${id}/messages`, {
        message: newMessage.trim()
      });
      
      setMessages(prev => [...prev, response.data.data]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'PENDING':
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          color: 'bg-yellow-100 text-yellow-800',
          message: 'Your return request is being reviewed.'
        };
      case 'APPROVED':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          color: 'bg-green-100 text-green-800',
          message: 'Your return has been approved. Please ship the items back to us.'
        };
      case 'REJECTED':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          color: 'bg-red-100 text-red-800',
          message: 'Your return request has been rejected.'
        };
      case 'PROCESSING':
        return {
          icon: <RotateCcw className="h-5 w-5 text-blue-500" />,
          color: 'bg-blue-100 text-blue-800',
          message: 'We are processing your returned items.'
        };
      case 'COMPLETED':
        return {
          icon: <CheckCircle className="h-5 w-5 text-purple-500" />,
          color: 'bg-purple-100 text-purple-800',
          message: 'Your return has been processed successfully.'
        };
      case 'CANCELLED':
        return {
          icon: <XCircle className="h-5 w-5 text-gray-500" />,
          color: 'bg-gray-100 text-gray-800',
          message: 'This return request has been cancelled.'
        };
      default:
        return {
          icon: <Info className="h-5 w-5 text-gray-500" />,
          color: 'bg-gray-100 text-gray-800',
          message: 'Status unknown.'
        };
    }
  };

  const statusInfo = returnRequest ? getStatusInfo(returnRequest.status) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !returnRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error loading return request</h2>
          <p className="text-gray-600 mb-6">{error || 'Return request not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/returns"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Returns
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Return #{returnRequest.id.slice(-8)}
              </h1>
              <p className="text-gray-600">
                Requested on {new Date(returnRequest.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {returnRequest.status === 'PENDING' && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Return'}
                </button>
              )}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                {returnRequest.status}
              </span>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`${statusInfo.color} p-4 rounded-lg mb-8 flex items-start gap-3`}>
          <div className="mt-0.5">
            {statusInfo.icon}
          </div>
          <div>
            <p className="font-medium">{statusInfo.message}</p>
            {returnRequest.status === 'APPROVED' && returnRequest.returnShippingLabel && (
              <div className="mt-2">
                <a
                  href={returnRequest.returnShippingLabel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-700 hover:underline"
                >
                  Download Return Shipping Label
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Being Returned */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Items Being Returned</h2>
              <div className="space-y-4">
                {returnRequest.returnItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={item.orderItem?.product?.images?.[0] || '/placeholder-product.jpg'}
                      alt={item.orderItem?.product?.name || 'Product'}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {item.orderItem?.product?.name || 'Product'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Qty: {item.quantity} • ${item.orderItem?.price || '0.00'} each
                      </p>
                      <p className="text-sm text-gray-700 mt-2">
                        <span className="font-medium">Reason:</span> {item.reason}
                      </p>
                      {item.notes && (
                        <p className="text-sm text-gray-700 mt-1">
                          <span className="font-medium">Notes:</span> {item.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ${(item.orderItem?.price * item.quantity).toFixed(2)}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getStatusInfo(item.status).color}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Return Instructions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Return Instructions</h2>
              <div className="prose prose-sm text-gray-700">
                {returnRequest.status === 'APPROVED' ? (
                  <>
                    <p>Please follow these steps to return your items:</p>
                    <ol className="list-decimal pl-5 space-y-2 mt-2">
                      <li>Package the items securely in their original packaging if possible.</li>
                      <li>Include all original accessories, manuals, and documentation.</li>
                      <li>Print and attach the return shipping label to your package.</li>
                      <li>Drop off the package at your nearest shipping location.</li>
                    </ol>
                    <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-md text-sm">
                      <AlertTriangle className="h-4 w-4 inline-block mr-1" />
                      Please return items within 14 days of approval to receive your refund.
                    </div>
                  </>
                ) : (
                  <p>Return instructions will be available once your return is approved.</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2 -mr-2">
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender === 'CUSTOMER'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No messages yet.</p>
                )}
              </div>
              <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={returnRequest.status === 'CANCELLED'}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || returnRequest.status === 'CANCELLED'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Return Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Return Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Return Reason</span>
                  <span className="font-medium text-gray-900">{returnRequest.reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Requested On</span>
                  <span className="text-gray-900">
                    {new Date(returnRequest.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number</span>
                  <Link
                    to={`/orders/${returnRequest.orderId}`}
                    className="text-blue-600 hover:underline"
                  >
                    #{returnRequest.order?.id?.slice(-8) || 'N/A'}
                  </Link>
                </div>
                <div className="pt-3 mt-3 border-t border-gray-200">
                  <div className="flex justify-between font-medium text-gray-900">
                    <span>Refund Amount</span>
                    <span>
                      $
                      {returnRequest.returnItems
                        .reduce(
                          (total, item) =>
                            total + item.quantity * (item.orderItem?.price || 0),
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Refund will be issued to the original payment method.
                  </p>
                </div>
              </div>
            </div>

            {/* Need Help? */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h2>
              <p className="text-sm text-gray-600 mb-4">
                If you have any questions about your return, please contact our customer service team.
              </p>
              <button className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cancel Return Request</h3>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel this return request? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={cancelling}
              >
                Keep Return
              </button>
              <button
                onClick={handleCancelReturn}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnDetail;
