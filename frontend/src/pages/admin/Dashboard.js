import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Package, DollarSign, TrendingUp, ShoppingCart, Download } from 'lucide-react';
import api from '../../utils/api';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import toast from 'react-hot-toast';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    conversionRate: 0,
    averageOrderValue: 0,
    recentOrders: [],
    months: [],
    revenueData: [],
    orderData: []
  });
  const [loading, setLoading] = useState(true);
  const [topProducts, setTopProducts] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchPendingReviews();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, productsRes, ordersRes] = await Promise.all([
        api.get('/users'),
        api.get('/products'),
        api.get('/orders')
      ]);

      const users = Array.isArray(usersRes.data.data) ? usersRes.data.data : [];
      const products = Array.isArray(productsRes.data.data) ? productsRes.data.data : [];
      const orders = Array.isArray(ordersRes.data.data) ? ordersRes.data.data : [];

      // Calculate metrics
      const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
      const conversionRate = users.length > 0 ? (orders.length / users.length) * 100 : 0;
      const recentOrders = orders.slice(0, 5);

      // Revenue/order trend by month
      const monthly = {};
      orders.forEach(order => {
        const d = new Date(order.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[key]) monthly[key] = { revenue: 0, orders: 0 };
        monthly[key].revenue += parseFloat(order.total || 0);
        monthly[key].orders += 1;
      });
      const months = Object.keys(monthly).sort();
      const revenueData = months.map(m => monthly[m].revenue);
      const orderData = months.map(m => monthly[m].orders);

      // Top products by sales
      const productSales = {};
      orders.forEach(order => {
        if (order.orderItems) {
          order.orderItems.forEach(item => {
            if (!productSales[item.product?.id]) {
              productSales[item.product?.id] = { ...item.product, sold: 0 };
            }
            productSales[item.product?.id].sold += item.quantity;
          });
        }
      });
      const topProductsArr = Object.values(productSales).sort((a, b) => b.sold - a.sold).slice(0, 5);
      setTopProducts(topProductsArr);

      setStats({
        totalUsers: users.length,
        totalProducts: products.length,
        totalOrders: orders.length,
        totalRevenue,
        conversionRate,
        averageOrderValue,
        recentOrders,
        months,
        revenueData,
        orderData
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await api.get('/products/reviews/moderation/pending');
      setPendingReviews(res.data.data || []);
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleReviewAction = async (reviewId, action) => {
    try {
      await api.put(`/products/reviews/${reviewId}/${action}`);
      toast.success(`Review ${action === 'approve' ? 'approved' : 'rejected'}`);
      fetchPendingReviews();
    } catch (error) {
      toast.error('Failed to update review');
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      // Placeholder for export functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setExportLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const revenueChartData = {
    labels: stats.months,
    datasets: [
      {
        label: 'Revenue',
        data: stats.revenueData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
    ],
  };

  const ordersChartData = {
    labels: stats.months,
    datasets: [
      {
        label: 'Orders',
        data: stats.orderData,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600 text-lg">Overview of your store performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:bg-gray-400 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportLoading ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Users className="h-8 w-8" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Products</p>
              <p className="text-3xl font-bold">{stats.totalProducts}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Package className="h-8 w-8" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Orders</p>
              <p className="text-3xl font-bold">{stats.totalOrders}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <ShoppingCart className="h-8 w-8" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <DollarSign className="h-8 w-8" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Key Metrics</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500 rounded-lg mr-3">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-gray-700 font-medium">Conversion Rate</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">{stats.conversionRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
              <div className="flex items-center">
                <div className="p-2 bg-green-500 rounded-lg mr-3">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <span className="text-gray-700 font-medium">Average Order Value</span>
              </div>
              <span className="text-2xl font-bold text-green-600">${stats.averageOrderValue.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Top Products</h3>
          <div className="space-y-4">
            {topProducts.slice(0, 3).map((product, index) => (
              <div key={product.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3">
                    {index + 1}
                  </div>
                  <span className="text-gray-700 font-medium truncate">{product.name}</span>
                </div>
                <span className="font-bold text-purple-600">{product.sold} sold</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Revenue Trend</h3>
          <Line data={revenueChartData} options={chartOptions} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Orders Trend</h3>
          <Bar data={ordersChartData} options={chartOptions} />
        </motion.div>
      </div>

      {/* Recent Orders & Pending Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Orders</h3>
          <div className="space-y-4">
            {stats.recentOrders.map((order) => (
              <div key={order.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-100">
                <div>
                  <p className="font-bold text-gray-900">Order #{order.id.slice(-8)}</p>
                  <p className="text-sm text-gray-600">${order.total}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Pending Reviews</h3>
          {loadingReviews ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : pendingReviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No pending reviews</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReviews.slice(0, 3).map((review) => (
                <div key={review.id} className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                  <p className="font-bold text-gray-900">{review.user?.firstName} {review.user?.lastName}</p>
                  <p className="text-sm text-gray-600 mb-3">{review.comment}</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleReviewAction(review.id, 'approve')}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewAction(review.id, 'reject')}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard; 