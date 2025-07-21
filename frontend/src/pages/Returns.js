import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ArrowRight, CheckCircle, XCircle, Clock, RotateCcw, ChevronRight } from 'lucide-react';
import api from '../utils/api';

const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await api.get('/returns');
      setReturns(response.data.data || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5" />;
      case 'PROCESSING':
        return <RotateCcw className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Returns & Refunds</h1>
        <p className="text-gray-600">Track your return and refund requests</p>
      </div>

      {returns.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Package className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No return requests yet</h3>
          <p className="text-gray-600 mb-6">You haven't requested any returns or refunds.</p>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            View Orders
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {returns.map((returnRequest) => (
            <motion.div
              key={returnRequest.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <Link to={`/returns/${returnRequest.id}`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Return #{returnRequest.id.slice(-8)}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(returnRequest.status)}
                          <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(returnRequest.status)}`}>
                            {returnRequest.status}
                          </span>
                        </div>
                        <div>
                          Order #{returnRequest.order?.id?.slice(-8) || 'N/A'}
                        </div>
                        <div>
                          {new Date(returnRequest.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>

                  <div className="space-y-3">
                    {returnRequest.returnItems?.slice(0, 2).map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <img
                          src={item.orderItem?.product?.images?.[0] || '/placeholder-product.jpg'}
                          alt={item.orderItem?.product?.name || 'Product'}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {item.orderItem?.product?.name || 'Product'}
                          </h4>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                    {returnRequest.returnItems?.length > 2 && (
                      <div className="text-sm text-gray-500">
                        +{returnRequest.returnItems.length - 2} more items
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Returns;
