import React, { useEffect, useState } from 'react';
import { Plus, Download, Box, ListFilter, Tag, Layers, PackageCheck } from 'lucide-react';
import api from '../../utils/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Products = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    categoryId: '',
    price: '',
    stock: '',
    status: 'Active',
    description: '',
  });
  const [addFormErrors, setAddFormErrors] = useState({});
  const [addLoading, setAddLoading] = useState(false);
  const [addImages, setAddImages] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState({});

  useEffect(() => {
    // Check if user is authenticated and has admin role
    console.log('Auth check:', { isAuthenticated, user: user?.role });
    
    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (user && user.role !== 'ADMIN') {
      console.log('Not admin, redirecting to home');
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [catRes, prodRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products'),
        ]);
        setCategories(catRes.data.data || []);
        setProducts(prodRes.data.data || []);
      } catch (err) {
        setError('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated, user, navigate]);

  const openAddModal = () => {
    setAddForm({ name: '', categoryId: '', price: '', stock: '', status: 'Active', description: '' });
    setAddFormErrors({});
    setAddImages([]);
    setShowAddModal(true);
  };
  const closeAddModal = () => setShowAddModal(false);

  const handleAddFormChange = (field, value) => {
    setAddForm(prev => ({ ...prev, [field]: value }));
    setAddFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleAddImagesChange = (e) => {
    const files = Array.from(e.target.files);
    console.log('Files selected:', files.length);
    console.log('Files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    // Simple validation
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    
    console.log('Valid files:', validFiles.length);
    setAddImages(validFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', files.length);
    console.log('Dropped files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    // Simple validation
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    
    console.log('Valid dropped files:', validFiles.length);
    setAddImages(validFiles);
  };

  const validateAddForm = () => {
    const errs = {};
    if (!addForm.name.trim()) errs.name = 'Product name is required';
    if (!addForm.categoryId) errs.categoryId = 'Category is required';
    if (!addForm.price || isNaN(addForm.price)) errs.price = 'Valid price is required';
    if (!addForm.stock || isNaN(addForm.stock)) errs.stock = 'Valid stock is required';
    if (!addForm.status) errs.status = 'Status is required';
    if (!addForm.description.trim()) errs.description = 'Description is required';
    if (addImages.length === 0) errs.images = 'At least one image is required';
    setAddFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submission started');
    console.log('Form data:', addForm);
    console.log('Images:', addImages.length);
    
    if (!validateAddForm()) {
      console.log('Form validation failed');
      return;
    }
    
    setAddLoading(true);
    
    try {
      const formData = new FormData();
      
      // Append all form fields
      Object.entries(addForm).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
          console.log('Added field:', key, value);
        }
      });
      
      // Append all images
      addImages.forEach((file, index) => {
        formData.append('images', file);
        console.log('Added image:', index, file.name, file.size);
      });

      console.log('Submitting product with', addImages.length, 'images');
      console.log('FormData entries:', Array.from(formData.entries()));

      await api.post('/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Product added successfully!');
      
      // Reset form and close modal
      setShowAddModal(false);
      setAddForm({ 
        name: '', 
        categoryId: '', 
        price: '', 
        stock: '', 
        status: 'Active',
        description: '' 
      });
      setAddFormErrors({});
      setAddImages([]);
      
      // Refresh products
      const prodRes = await api.get('/products');
      setProducts(prodRes.data.data || []);
    } catch (err) {
      console.error('Error adding product:', err);
      
      let errorMessage = 'Failed to add product. Please try again.';
      
      if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Invalid data provided.';
      } else if (err.response?.status === 413) {
        errorMessage = 'File too large. Please use smaller images.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      setAddFormErrors({ 
        api: errorMessage
      });
      
      toast.error(errorMessage);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(prev => ({ ...prev, [productId]: true }));
    
    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product deleted successfully!');
      
      // Remove product from state
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      console.error('Error deleting product:', err);
      
      let errorMessage = 'Failed to delete product. Please try again.';
      
      if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Product not found.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(prev => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2" aria-label="Admin Products Page">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-gray-500 mb-1" aria-label="Breadcrumb">
        <span className="mr-2">Admin</span>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-700">Products</span>
      </nav>

      {/* Page Title and Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-1 gap-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-0.5">Manage Products</h1>
          <p className="text-gray-500 text-xs">Add, edit, and manage your product catalog</p>
        </div>
        <div className="flex gap-2">
          <button aria-label="Export Products" className="btn btn-secondary">
            <Download className="h-4 w-4 mr-1" /> Export
          </button>
          <button aria-label="Add Product" className="btn btn-primary" onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </button>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <motion.div 
            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add Product</h2>
              <button onClick={closeAddModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            {addFormErrors.api && <div className="text-red-500 mb-2 text-sm">{addFormErrors.api}</div>}
            <form onSubmit={handleAddSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Product Name</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={e => handleAddFormChange('name', e.target.value)}
                  className="input"
                  placeholder="Enter product name"
                />
                {addFormErrors.name && <div className="text-red-500 text-xs mt-1">{addFormErrors.name}</div>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                <select
                  value={addForm.categoryId}
                  onChange={e => handleAddFormChange('categoryId', e.target.value)}
                  className="input"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {addFormErrors.categoryId && <div className="text-red-500 text-xs mt-1">{addFormErrors.categoryId}</div>}
              </div>
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Price</label>
                  <input
                    type="number"
                    value={addForm.price}
                    onChange={e => handleAddFormChange('price', e.target.value)}
                    className="input"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  {addFormErrors.price && <div className="text-red-500 text-xs mt-1">{addFormErrors.price}</div>}
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Stock</label>
                  <input
                    type="number"
                    value={addForm.stock}
                    onChange={e => handleAddFormChange('stock', e.target.value)}
                    className="input"
                    placeholder="0"
                    min="0"
                  />
                  {addFormErrors.stock && <div className="text-red-500 text-xs mt-1">{addFormErrors.stock}</div>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                <select
                  value={addForm.status}
                  onChange={e => handleAddFormChange('status', e.target.value)}
                  className="input"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {addFormErrors.status && <div className="text-red-500 text-xs mt-1">{addFormErrors.status}</div>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea
                  value={addForm.description}
                  onChange={e => handleAddFormChange('description', e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="Enter product description"
                />
                {addFormErrors.description && <div className="text-red-500 text-xs mt-1">{addFormErrors.description}</div>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Product Images</label>
                
                {/* Unified file upload area */}
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleAddImagesChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    id="file-upload-input"
                  />
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-300 hover:bg-gray-50 transition-colors cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">
                      {addImages.length > 0 
                        ? `${addImages.length} image${addImages.length > 1 ? 's' : ''} selected` 
                        : 'Click to select or drag and drop images here'
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports: JPG, PNG, WebP (max 10MB each)
                    </p>
                  </div>
                </div>
                
                {/* Debug buttons */}
                <div className="mt-2 space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const fileInput = document.getElementById('file-upload-input');
                      if (fileInput) {
                        fileInput.click();
                        console.log('File input clicked');
                      } else {
                        console.log('File input not found');
                      }
                    }}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    Test: Open File Picker
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Current images:', addImages);
                      console.log('Images length:', addImages.length);
                      toast.success(`Selected ${addImages.length} images`);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Debug: Check Images
                  </button>
                </div>

                {addFormErrors.images && <div className="text-red-500 text-xs mt-1">{addFormErrors.images}</div>}
                
                {/* Preview selected images */}
                {addImages.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Selected Images ({addImages.length})</h4>
                      <button
                        type="button"
                        onClick={() => setAddImages([])}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {addImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={URL.createObjectURL(img)}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-20 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-300"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newImages = [...addImages];
                              newImages.splice(idx, 1);
                              setAddImages(newImages);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                            aria-label="Remove image"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center rounded-b-lg">
                            {img.name.length > 12 ? img.name.substring(0, 9) + '...' : img.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:bg-gray-400 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {addLoading ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Filters in a card */}
      <div className="card mb-2 flex flex-col md:flex-row md:items-center gap-1 p-2" role="region" aria-label="Product Filters">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search products..."
            aria-label="Search products"
            className="input pl-10 pr-3"
          />
          <ListFilter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
        <div className="relative w-full md:w-48">
          <select
            className="input pl-9 pr-3 appearance-none"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative w-full md:w-40">
          <select className="input pl-9 pr-3 appearance-none" aria-label="Filter by stock">
            <option>All Stock</option>
          </select>
          <Layers className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative w-full md:w-40">
          <select className="input pl-9 pr-3 border-blue-500 bg-blue-50 text-blue-700 font-semibold appearance-none" aria-label="Bulk actions">
            <option>Bulk Actions</option>
          </select>
          <PackageCheck className="absolute left-3 top-2.5 h-4 w-4 text-blue-400 pointer-events-none" />
        </div>
      </div>

      {/* Products Table in a card */}
      <div className="card overflow-x-auto" role="region" aria-label="Products Table">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
            <span className="text-gray-500">Loading products...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6">
            <span className="text-red-500 font-medium mb-2">{error}</span>
            <button onClick={() => window.location.reload()} className="btn btn-primary text-sm" aria-label="Retry loading products">Retry</button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Box className="h-12 w-12 text-gray-300 mb-3" />
            <h2 className="text-lg font-semibold mb-1 text-gray-700">No products found</h2>
            <p className="mb-3 text-gray-500 text-sm">Get started by adding your first product.</p>
            <button className="btn btn-primary" aria-label="Add Product">
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200" role="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" scope="col">
                  <input type="checkbox" aria-label="Select all products" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer group" title="Sort by Product Name" scope="col" tabIndex={0} aria-label="Sort by Product Name">
                  Product
                  <span className="inline-block align-middle ml-1 text-gray-400 group-hover:text-blue-500">▲▼</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer group" title="Sort by Category" scope="col" tabIndex={0} aria-label="Sort by Category">
                  Category
                  <span className="inline-block align-middle ml-1 text-gray-400 group-hover:text-blue-500">▲▼</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer group" title="Sort by Price" scope="col" tabIndex={0} aria-label="Sort by Price">
                  Price
                  <span className="inline-block align-middle ml-1 text-gray-400 group-hover:text-blue-500">▲▼</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer group" title="Sort by Stock" scope="col" tabIndex={0} aria-label="Sort by Stock">
                  Stock
                  <span className="inline-block align-middle ml-1 text-gray-400 group-hover:text-blue-500">▲▼</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer group" title="Sort by Status" scope="col" tabIndex={0} aria-label="Sort by Status">
                  Status
                  <span className="inline-block align-middle ml-1 text-gray-400 group-hover:text-blue-500">▲▼</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {products.map((product, idx) => (
                <tr key={product.id} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50 transition' : 'bg-gray-50 hover:bg-gray-100 transition'} tabIndex={0}>
                  <td className="px-4 py-3">
                    <input type="checkbox" aria-label={`Select product ${product.name}`} />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                    {/* Product image/avatar here if available */}
                    {product.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {product.category?.name || 'Uncategorized'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">${product.price}</td>
                  <td className="px-4 py-3 text-gray-700">{product.stock}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${product.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button className="btn btn-secondary text-xs flex items-center" title="Edit Product" aria-label={`Edit product ${product.name}`} tabIndex={0}>
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4 1a4 4 0 01-1.414-.828z" /></svg>
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger text-xs flex items-center" 
                      title="Delete Product" 
                      aria-label={`Delete product ${product.name}`} 
                      tabIndex={0}
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                      disabled={deleteLoading[product.id]}
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                      {deleteLoading[product.id] ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Products; 