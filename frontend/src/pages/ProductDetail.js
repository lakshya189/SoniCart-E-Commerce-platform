import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ShoppingCart, Heart, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '').replace('http', 'ws') || 'ws://localhost:5000';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [error, setError] = useState(null);
  const [editingReview, setEditingReview] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewErrors, setReviewErrors] = useState({});
  const [reviewApiError, setReviewApiError] = useState('');

  // Find current user's review
  const userReview = user ? reviews.find(r => r.user.id === user.id) : null;

  useEffect(() => {
    fetchProduct();
    fetchReviews();
    // Socket.io for real-time stock updates
    const socket = io(SOCKET_URL);
    socket.on('productStockUpdated', ({ productId, stock }) => {
      setProduct((prev) => prev && prev.id === productId ? { ...prev, stock } : prev);
    });
    return () => {
      socket.disconnect();
    };
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/products/${id}`);
      setProduct(response.data.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Product not found or failed to load');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/products/${id}/reviews`);
      setReviews(response.data.data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Don't set error for reviews, just log it
    }
  };

  const handleAddToCart = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    addToCart(product.id, quantity);
  };

  const handleEditReview = () => {
    setReviewForm({ rating: userReview.rating, comment: userReview.comment || '' });
    setShowReviewForm(true);
    setEditingReview(true);
  };

  const handleDeleteReview = async () => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    setReviewLoading(true);
    try {
      await api.delete(`/products/${id}/reviews`);
      toast.success('Review deleted');
      setShowReviewForm(false);
      setEditingReview(false);
      fetchReviews();
    } catch (error) {
      toast.error('Failed to delete review');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReviewFormChange = (field, value) => {
    setReviewForm(prev => ({ ...prev, [field]: value }));
    setReviewErrors(prev => ({ ...prev, [field]: '' }));
    setReviewApiError('');
  };
  const validateReview = () => {
    const errs = {};
    if (!reviewForm.rating) errs.rating = 'Rating is required';
    setReviewErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewApiError('');
    if (!validateReview()) return;
    setReviewLoading(true);
    try {
      if (editingReview) {
        await api.put(`/products/${id}/reviews`, reviewForm);
        toast.success('Review updated');
      } else {
        await api.post(`/products/${id}/reviews`, reviewForm);
        toast.success('Review submitted');
      }
      setShowReviewForm(false);
      setEditingReview(false);
      setReviewForm({ rating: 5, comment: '' });
      fetchReviews();
    } catch (error) {
      setReviewApiError(error?.response?.data?.message || 'Failed to submit review');
      toast.error(error?.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  const nextImage = () => {
    if (product?.images?.length > 1) {
      setSelectedImage((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product?.images?.length > 1) {
      setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  // Default placeholder image
  const getDefaultImage = () => {
    return 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop';
  };

  // Get current image or default
  const getCurrentImage = () => {
    if (product?.images?.length > 0 && product.images[selectedImage]) {
      return product.images[selectedImage];
    }
    return getDefaultImage();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product not found</h2>
          <p className="text-gray-600 mb-4">{error || "The product you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate('/products')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>{product ? `${product.name} - SonicArt` : 'Product Details - SonicArt'}</title>
        <meta name="description" content={product ? product.description : 'View product details, reviews, and buy online at SonicArt.'} />
        <meta property="og:title" content={product ? `${product.name} - SonicArt` : 'Product Details - SonicArt'} />
        <meta property="og:description" content={product ? product.description : 'View product details, reviews, and buy online at SonicArt.'} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`https://yourdomain.com/products/${id}`} />
        <meta property="og:image" content={product && product.images && product.images[0] ? product.images[0] : '/logo192.png'} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={product ? `${product.name} - SonicArt` : 'Product Details - SonicArt'} />
        <meta name="twitter:description" content={product ? product.description : 'View product details, reviews, and buy online at SonicArt.'} />
        <meta name="twitter:image" content={product && product.images && product.images[0] ? product.images[0] : '/logo192.png'} />
        <link rel="canonical" href={`https://yourdomain.com/products/${id}`} />
      </Helmet>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-white rounded-lg shadow-sm overflow-hidden">
            <img
              src={getCurrentImage()}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = getDefaultImage();
              }}
            />
            
            {/* Navigation Arrows */}
            {product.images && product.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-sm"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-sm"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Images */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = getDefaultImage();
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-gray-600 mb-4">{product.description}</p>
            
            {/* Rating */}
            {averageRating > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= averageRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600">({reviews.length} reviews)</span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold text-blue-600">${product.price}</span>
            {product.comparePrice && (
              <span className="text-xl text-gray-500 line-through">${product.comparePrice}</span>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              product.stock > 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </span>
          </div>

          {/* Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Quantity:</label>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 hover:bg-gray-100"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="px-4 py-2 border-x border-gray-300">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 hover:bg-gray-100"
                  disabled={product.stock <= quantity}
                >
                  +
                </button>
              </div>
            </div>
            
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShoppingCart className="h-5 w-5" />
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>

          {/* Product Details */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h3>
            <div className="space-y-2 text-sm text-gray-600">
              {product.sku && <p><span className="font-medium">SKU:</span> {product.sku}</p>}
              {product.weight && <p><span className="font-medium">Weight:</span> {product.weight} lbs</p>}
              {product.dimensions && <p><span className="font-medium">Dimensions:</span> {product.dimensions}</p>}
              {product.category && <p><span className="font-medium">Category:</span> {product.category.name}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
          {user && !userReview && (
            <button
              onClick={() => { setShowReviewForm(!showReviewForm); setEditingReview(false); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showReviewForm ? 'Cancel' : 'Write a Review'}
            </button>
          )}
        </div>
        {/* Review Form */}
        {showReviewForm && (
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <form onSubmit={handleSubmitReview} className="space-y-4">
              {reviewApiError && <div className="mb-2 text-red-600 text-center text-sm font-medium">{reviewApiError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleReviewFormChange('rating', star)}
                      className="text-2xl"
                    >
                      <Star
                        className={`h-8 w-8 ${star <= reviewForm.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
                {reviewErrors.rating && <p className="mt-1 text-sm text-red-600">{reviewErrors.rating}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => handleReviewFormChange('comment', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder="Share your thoughts about this product..."
                />
              </div>
              
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={reviewLoading}
              >
                {reviewLoading ? (editingReview ? 'Updating...' : 'Submitting...') : (editingReview ? 'Update Review' : 'Submit Review')}
              </button>
            </form>
          </div>
        )}
        {/* Reviews List */}
        <div className="space-y-6">
          {userReview && !showReviewForm && (
            <div className="border border-blue-200 rounded-lg p-6 bg-blue-50 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {userReview.user.firstName?.[0]}{userReview.user.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {userReview.user.firstName} {userReview.user.lastName} (You)
                    </p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${star <= userReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(userReview.createdAt).toLocaleDateString()}
                </span>
              </div>
              {userReview.comment && (
                <p className="text-gray-700 mb-2">{userReview.comment}</p>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleEditReview}
                  className="px-4 py-1 rounded bg-yellow-400 text-white font-medium hover:bg-yellow-500"
                  disabled={reviewLoading}
                >
                  Edit
                </button>
                <button
                  onClick={handleDeleteReview}
                  className="px-4 py-1 rounded bg-red-500 text-white font-medium hover:bg-red-600"
                  disabled={reviewLoading}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
          {/* Other reviews */}
          {reviews.filter(r => !user || r.user.id !== user.id).length > 0 ? (
            reviews.filter(r => !user || r.user.id !== user.id).map((review) => (
              <div key={review.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {review.user.firstName?.[0]}{review.user.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {review.user.firstName} {review.user.lastName}
                      </p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-gray-700">{review.comment}</p>
                )}
              </div>
            ))
          ) : (
            !userReview && (
              <div className="text-center py-8">
                <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail; 