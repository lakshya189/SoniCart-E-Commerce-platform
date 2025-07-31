import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Package, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const TrackingInfo = ({ orderId }) => {
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTrackingInfo = useCallback(async () => {
    try {
      const response = await api.get(`/orders/${orderId}/tracking`);
      setTrackingInfo(response.data.data);
    } catch (error) {
      console.error('Error fetching tracking info:', error);
      toast.error('Failed to load tracking information');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchTrackingInfo();
  }, [orderId, fetchTrackingInfo]);

  const getStatusStep = (status) => {
    const steps = {
      'PENDING': 1,
      'PROCESSING': 2,
      'SHIPPED': 3,
      'DELIVERED': 4
    };
    return steps[status] || 1;
  };

  const getStatusIcon = (step, currentStep) => {
    if (step < currentStep) {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    } else if (step === currentStep) {
      return <Clock className="w-6 h-6 text-blue-500" />;
    } else {
      return <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!trackingInfo) {
    return (
      <div className="text-center py-8">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No tracking information available</p>
      </div>
    );
  }

  const currentStep = getStatusStep(trackingInfo.status);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Order Tracking</h3>
        {trackingInfo.trackingNumber && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Tracking #:</span> {trackingInfo.trackingNumber}
          </div>
        )}
      </div>

      {/* Tracking Timeline */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          {getStatusIcon(1, currentStep)}
          <div className="flex-1">
            <div className="font-medium text-gray-900">Order Placed</div>
            <div className="text-sm text-gray-500">{formatDate(trackingInfo.createdAt)}</div>
          </div>
        </div>

        <div className="flex items-center space-x-4 mt-4">
          {getStatusIcon(2, currentStep)}
          <div className="flex-1">
            <div className="font-medium text-gray-900">Processing</div>
            <div className="text-sm text-gray-500">Your order is being prepared</div>
          </div>
        </div>

        <div className="flex items-center space-x-4 mt-4">
          {getStatusIcon(3, currentStep)}
          <div className="flex-1">
            <div className="font-medium text-gray-900">Shipped</div>
            {trackingInfo.shippedAt && (
              <div className="text-sm text-gray-500">{formatDate(trackingInfo.shippedAt)}</div>
            )}
            {trackingInfo.carrierInfo && (
              <div className="text-sm text-gray-500">
                Carrier: {trackingInfo.carrierInfo.name}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4 mt-4">
          {getStatusIcon(4, currentStep)}
          <div className="flex-1">
            <div className="font-medium text-gray-900">Delivered</div>
            {trackingInfo.deliveredAt && (
              <div className="text-sm text-gray-500">{formatDate(trackingInfo.deliveredAt)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Tracking Details */}
      {trackingInfo.trackingNumber && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Shipping Details</div>
              {trackingInfo.carrierInfo && (
                <div className="text-sm text-gray-600">
                  {trackingInfo.carrierInfo.name}
                </div>
              )}
              {trackingInfo.estimatedDelivery && (
                <div className="text-sm text-gray-600">
                  Estimated delivery: {formatDate(trackingInfo.estimatedDelivery)}
                </div>
              )}
            </div>
            {trackingInfo.trackingUrl && (
              <a
                href={trackingInfo.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Track Package
              </a>
            )}
          </div>
        </div>
      )}

      {/* Current Status */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="flex items-center">
          <Truck className="w-5 h-5 text-blue-500 mr-2" />
          <div>
            <div className="font-medium text-blue-900">
              Current Status: {trackingInfo.status}
            </div>
            <div className="text-sm text-blue-700">
              {trackingInfo.status === 'PENDING' && 'Your order is being reviewed'}
              {trackingInfo.status === 'PROCESSING' && 'Your order is being prepared for shipping'}
              {trackingInfo.status === 'SHIPPED' && 'Your order is on its way'}
              {trackingInfo.status === 'DELIVERED' && 'Your order has been delivered'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingInfo; 