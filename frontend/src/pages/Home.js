import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Star, ShoppingCart, Heart } from 'lucide-react';
import api from '../utils/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CategoryGrid from '../components/ui/CategoryGrid';
import { Helmet } from 'react-helmet-async';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  // Fetch featured products
  const { data: featuredProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const response = await api.get('/products?featured=true&limit=6');
      return response.data.data;
    },
  });

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data.data;
    },
  });

  const handleAddToCart = async (productId) => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      window.location.href = '/login';
      return;
    }
    await addToCart(productId, 1);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>SonicArt - Discover Amazing Products</title>
        <meta name="description" content="Explore our curated collection of high-quality products designed to enhance your lifestyle. Shop now at SonicArt!" />
        <meta property="og:title" content="SonicArt - Discover Amazing Products" />
        <meta property="og:description" content="Explore our curated collection of high-quality products designed to enhance your lifestyle. Shop now at SonicArt!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://yourdomain.com/" />
        <meta property="og:image" content="/logo192.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SonicArt - Discover Amazing Products" />
        <meta name="twitter:description" content="Explore our curated collection of high-quality products designed to enhance your lifestyle. Shop now at SonicArt!" />
        <meta name="twitter:image" content="/logo192.png" />
        <link rel="canonical" href="https://yourdomain.com/" />
      </Helmet>
      {/* Hero Section */}
      <section className="relative text-white py-20 overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          {!videoError ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
              style={{ filter: 'blur(0.3px) brightness(2.7)' }}
              onError={() => setVideoError(true)}
              ref={videoRef}
            >
              <source src="/videos/55290-499594204.mp4" type="video/mp4" />
              {/* Fallback gradient if video fails to load */}
            </video>
          ) : (
            /* Fallback gradient background */
            <div className="w-full h-full bg-gradient-to-r from-primary-600 to-primary-800"></div>
          )}
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/80 to-primary-800/80"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Discover Amazing Products
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100 max-w-3xl mx-auto">
              Explore our curated collection of high-quality products designed to enhance your lifestyle
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/products"
                className="inline-flex items-center px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                Shop Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/products?featured=true"
                className="inline-flex items-center px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-primary-600 transition-colors duration-200"
              >
                Featured Products
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Shop by Category
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover our curated collections designed to enhance your lifestyle
            </p>
          </motion.div>

          <CategoryGrid
            categories={categories}
            loading={categoriesLoading}
            gridCols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            gap="gap-8"
            showImage={true}
            showProductCount={true}
          />
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-lg text-gray-600">Handpicked products for you</p>
          </motion.div>

          {productsLoading ? (
            <LoadingSpinner size="lg" />
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {featuredProducts?.map((product) => (
                <motion.div
                  key={product.id}
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative"
                >
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleWishlist(product.id);
                      }}
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors"
                      aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                    </button>
                  </div>
                  <Link to={`/products/${product.id}`}>
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  </Link>
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">
                        {product.category?.name || 'Uncategorized'}
                      </span>
                      {product.averageRating > 0 && (
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600">{product.averageRating}</span>
                        </div>
                      )}
                    </div>
                    
                    <Link to={`/products/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 mb-2 hover:text-primary-600 transition-colors duration-200">
                        {product.name}
                      </h3>
                    </Link>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl font-bold text-gray-900">
                          ${product.price}
                        </span>
                        {product.comparePrice && (
                          <span className="text-sm text-gray-500 line-through">
                            ${product.comparePrice}
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleAddToCart(product.id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span className="text-sm">Add to Cart</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-12"
          >
            <Link
              to="/products"
              className="inline-flex items-center px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors duration-200"
            >
              View All Products
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-4">Ready to Start Shopping?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust SonicArt for their shopping needs
            </p>
            <Link
              to="/products"
              className="inline-flex items-center px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors duration-200"
            >
              Start Shopping Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home; 