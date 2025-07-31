import React, { useState, useEffect } from 'react';
import { X, Truck, Calendar, Package } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const TrackingModal = ({ isOpen, onClose, orderId, onTrackingUpdated }) => {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    trackingNumber: '',
    shippingCarrier: '',
    estimatedDelivery: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchCarriers();
    }
  }, [isOpen]);

  const fetchCarriers = async () => {
    try {
      const response = await api.get('/orders/carriers');
      setCarriers(response.data.data);
    } catch (error) {
      console.error('Error fetching carriers:', error);
      toast.error('Failed to load shipping carriers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.trackingNumber || !formData.shippingCarrier) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/orders/${orderId}/tracking`, formData);
      toast.success('Tracking information updated successfully');
      onTrackingUpdated();
      onClose();
      setFormData({ trackingNumber: '', shippingCarrier: '', estimatedDelivery: '' });
    } catch (error) {
      console.error('Error updating tracking:', error);
      const message = error.response?.data?.message || 'Failed to update tracking information';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Truck className="w-5 h-5 mr-2 text-blue-500" />
            Add Tracking Information
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shipping Carrier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shipping Carrier *
            </label>
            <select
              name="shippingCarrier"
              value={formData.shippingCarrier}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a carrier</option>
              {carriers.map((carrier) => (
                <option key={carrier.code} value={carrier.code}>
                  {carrier.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tracking Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tracking Number *
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="trackingNumber"
                value={formData.trackingNumber}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter tracking number"
                required
              />
            </div>
          </div>

          {/* Estimated Delivery */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Delivery Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="date"
                name="estimatedDelivery"
                value={formData.estimatedDelivery}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Tracking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrackingModal; 