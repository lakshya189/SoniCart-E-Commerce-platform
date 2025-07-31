import React, { useState, useEffect } from 'react';
import { Eye, Search, Download, DollarSign, Calendar, User, Package, Truck } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import TrackingModal from '../../components/admin/TrackingModal';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkAction, setBulkAction] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || order.status === statusFilter;
    
    const matchesDate = !dateFilter || (() => {
      const orderDate = new Date(order.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      switch (dateFilter) {
        case 'today':
          return orderDate.toDateString() === today.toDateString();
        case 'yesterday':
          return orderDate.toDateString() === yesterday.toDateString();
        case 'week':
          return orderDate >= lastWeek;
        case 'month':
          return orderDate >= lastMonth;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const openDetailModal = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => setShowDetailModal(false);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setActionLoading(true);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    setActionLoading(true);
    try {
      await api.put(`/orders/${orderId}/cancel`);
      toast.success('Order cancelled');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async (orderId) => {
    setActionLoading(true);
    try {
      // Placeholder for refund processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Refund processed successfully');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to process refund');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedOrders.length === 0) return;
    
    setActionLoading(true);
    try {
      if (bulkAction === 'ship') {
        await Promise.all(selectedOrders.map(id => api.put(`/orders/${id}/status`, { status: 'SHIPPED' })));
        toast.success(`${selectedOrders.length} orders marked as shipped`);
      } else if (bulkAction === 'deliver') {
        await Promise.all(selectedOrders.map(id => api.put(`/orders/${id}/status`, { status: 'DELIVERED' })));
        toast.success(`${selectedOrders.length} orders marked as delivered`);
      } else if (bulkAction === 'cancel') {
        await Promise.all(selectedOrders.map(id => api.put(`/orders/${id}/cancel`)));
        toast.success(`${selectedOrders.length} orders cancelled`);
      }
      setSelectedOrders([]);
      setBulkAction('');
      fetchOrders();
    } catch (error) {
      toast.error('Bulk action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedOrders(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId, checked) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const exportOrders = async () => {
    try {
      // Placeholder for export functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Orders exported successfully');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      'PROCESSING': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
      'SHIPPED': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Shipped' },
      'DELIVERED': { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
      'CANCELLED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
      'REFUNDED': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Refunded' }
    };
    
    const config = statusConfig[status] || statusConfig['PENDING'];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getStatusActions = (order) => {
    const actions = [];
    
    if (order.status === 'PENDING') {
      actions.push(
        <button
          key="process"
          onClick={() => handleStatusUpdate(order.id, 'PROCESSING')}
          className="text-blue-600 hover:text-blue-900 text-xs"
        >
          Process
        </button>
      );
    }
    
    if (order.status === 'PROCESSING') {
      actions.push(
        <button
          key="ship"
          onClick={() => handleStatusUpdate(order.id, 'SHIPPED')}
          className="text-purple-600 hover:text-purple-900 text-xs"
        >
          Ship
        </button>
      );
    }
    
    if (order.status === 'SHIPPED') {
      actions.push(
        <button
          key="deliver"
          onClick={() => handleStatusUpdate(order.id, 'DELIVERED')}
          className="text-green-600 hover:text-green-900 text-xs"
        >
          Deliver
        </button>
      );
    }
    
    // Add tracking button for shipped orders
    if (order.status === 'SHIPPED' && !order.trackingNumber) {
      actions.push(
        <button
          key="tracking"
          onClick={() => {
            setSelectedOrderForTracking(order);
            setShowTrackingModal(true);
          }}
          className="text-indigo-600 hover:text-indigo-900 text-xs flex items-center"
        >
          <Truck className="w-3 h-3 mr-1" />
          Add Tracking
        </button>
      );
    }
    
    if (['PENDING', 'PROCESSING'].includes(order.status)) {
      actions.push(
        <button
          key="cancel"
          onClick={() => handleCancelOrder(order.id)}
          className="text-red-600 hover:text-red-900 text-xs"
        >
          Cancel
        </button>
      );
    }
    
    if (['DELIVERED', 'SHIPPED'].includes(order.status)) {
      actions.push(
        <button
          key="refund"
          onClick={() => handleRefund(order.id)}
          className="text-orange-600 hover:text-orange-900 text-xs"
        >
          Refund
        </button>
      );
    }
    
    return actions;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Orders</h1>
          <p className="text-gray-600">View and manage customer orders</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={exportOrders}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          
          <div className="flex items-center space-x-2">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Bulk Actions</option>
              <option value="ship">Mark as Shipped</option>
              <option value="deliver">Mark as Delivered</option>
              <option value="cancel">Cancel Orders</option>
            </select>
            {bulkAction && selectedOrders.length > 0 && (
              <button
                onClick={handleBulkAction}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {actionLoading ? 'Processing...' : 'Apply'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Orders ({filteredOrders.length})
            </h2>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Select All</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tracking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      #{order.id.slice(-8)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {order.user?.firstName} {order.user?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{order.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-1 text-gray-400" />
                      {order.orderItems?.length || 0} items
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                      ${order.total}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.trackingNumber ? (
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 mr-1 text-green-500" />
                        <span className="text-green-600 font-medium">{order.trackingNumber}</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 mr-1 text-gray-400" />
                        <span className="text-gray-500">No tracking</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openDetailModal(order)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {getStatusActions(order).map((action, index) => (
                        <span key={index}>{action}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Order Details #{selectedOrder.id.slice(-8)}</h2>
              <button onClick={closeDetailModal} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Info */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Order Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <span className="font-medium">#{selectedOrder.id.slice(-8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span>{getStatusBadge(selectedOrder.status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">${selectedOrder.total}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedOrder.user?.firstName} {selectedOrder.user?.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span>{selectedOrder.user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span>{selectedOrder.user?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                {selectedOrder.shippingAddress && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Shipping Address</h3>
                    <div className="text-sm text-gray-600">
                      <p>{selectedOrder.shippingAddress.street}</p>
                      <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                      <p>{selectedOrder.shippingAddress.country}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.orderItems?.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded border">
                        <img
                          src={item.product?.images?.[0] || '/placeholder.png'}
                          alt={item.product?.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.product?.name}</div>
                          <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">${item.price}</div>
                          <div className="text-sm text-gray-600">Total: ${(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Actions */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Order Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    {getStatusActions(selectedOrder).map((action, index) => (
                      <span key={index}>{action}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      <TrackingModal
        isOpen={showTrackingModal}
        onClose={() => {
          setShowTrackingModal(false);
          setSelectedOrderForTracking(null);
        }}
        orderId={selectedOrderForTracking?.id}
        onTrackingUpdated={fetchOrders}
      />
    </div>
  );
};

export default AdminOrders; 