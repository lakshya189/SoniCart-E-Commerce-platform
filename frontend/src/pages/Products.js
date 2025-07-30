import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Search, Grid, List, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { Filter } from 'lucide-react';
import api from '../utils/api';
// import { io } from 'socket.io-client';
import { Helmet } from 'react-helmet-async';
import { useWishlist } from '../contexts/WishlistContext';

// const SOCKET_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '').replace('http', 'ws') || 'ws://localhost:5000';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const { toggleWishlist, isInWishlist } = useWishlist();
  
  // Get current filters from URL
  const currentPage = parseInt(searchParams.get('page')) || 1;
  const currentSearch = searchParams.get('search') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentSort = searchParams.get('sort') || 'created_desc';
  const currentLimit = parseInt(searchParams.get('limit')) || 12;

  // Define fetchProducts and fetchCategories first
  const fetchProducts = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: currentLimit,
        sort: currentSort,
        ...(currentSearch && { search: currentSearch }),
        ...(currentCategory && { category: currentCategory }),
      });

      const response = await api.get(`/products?${params}`);
      setProducts(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentLimit, currentSort, currentSearch, currentCategory]);

  const fetchCategories = React.useCallback(async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  // Then define fetchData that uses them
  const fetchData = React.useCallback(async () => {
    await fetchProducts();
    await fetchCategories();
  }, [fetchProducts, fetchCategories]);

  useEffect(() => {
    fetchData();
    // Socket.io for real-time stock updates (temporarily disabled)
    // const socket = io(SOCKET_URL);
    // socket.on('productStockUpdated', ({ productId, stock }) => {
    //   setProducts((prev) => prev.map(p => p.id === productId ? { ...p, stock } : p));
    // });
    // return () => {
    //   socket.disconnect();
    // };
  }, [fetchData]);

  // Set search input when URL changes
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);



  const handleSearch = (searchTerm) => {
    const newParams = new URLSearchParams(searchParams);
    if (searchTerm) {
      newParams.set('search', searchTerm);
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
  };

  const handleCategoryChange = (categorySlug) => {
    const newParams = new URLSearchParams(searchParams);
    if (categorySlug) {
      newParams.set('category', categorySlug);
    } else {
      newParams.delete('category');
    }
    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
  };

  const handleSortChange = (sortBy) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', sortBy);
    setSearchParams(newParams);
  };

  const handlePageChange = (page) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page);
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleSearch(searchInput);
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
      <Helmet>
        <title>All Products - SonicArt</title>
        <meta name="description" content="Browse all products available at SonicArt. Find the best deals and new arrivals in our online store." />
        <meta property="og:title" content="All Products - SonicArt" />
        <meta property="og:description" content="Browse all products available at SonicArt. Find the best deals and new arrivals in our online store." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://yourdomain.com/products" />
        <meta property="og:image" content="/logo192.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="All Products - SonicArt" />
        <meta name="twitter:description" content="Browse all products available at SonicArt. Find the best deals and new arrivals in our online store." />
        <meta name="twitter:image" content="/logo192.png" />
        <link rel="canonical" href="https://yourdomain.com/products" />
      </Helmet>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Products</h1>
        <p className="text-gray-600">Discover our amazing collection of products</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </form>

          {/* Category Filter */}
          <select
            value={currentCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="created_desc">Newest First</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="name_desc">Name: Z to A</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>

          {/* View Mode */}
          <div className="flex border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'}`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-gray-600">
          Showing {products.length} of {pagination.total || 0} products
          {currentSearch && ` for "${currentSearch}"`}
        </p>
      </div>

      {/* Products Grid/List */}
      {products.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 relative"
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
                    <div className="aspect-square overflow-hidden rounded-t-lg">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">{product.category?.name}</span>
                        {product.averageRating > 0 && (
                          <div className="flex items-center space-x-1">
                            <span className="text-sm text-gray-600">{product.averageRating}</span>
                            <span className="text-yellow-400">★</span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-blue-600">${product.price}</span>
                          {product.comparePrice && (
                            <span className="text-sm text-gray-500 line-through">${product.comparePrice}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">In Stock: {product.stock}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <Link to={`/products/${product.id}`}>
                    <div className="flex">
                      <div className="w-32 h-32 flex-shrink-0">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-l-lg"
                        />
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-500">{product.category?.name}</span>
                          {product.averageRating > 0 && (
                            <div className="flex items-center space-x-1">
                              <span className="text-sm text-gray-600">{product.averageRating}</span>
                              <span className="text-yellow-400">★</span>
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{product.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-blue-600">${product.price}</span>
                            {product.comparePrice && (
                              <span className="text-sm text-gray-500 line-through">${product.comparePrice}</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">In Stock: {product.stock}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 border rounded-lg ${
                    page === currentPage
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default Products; 