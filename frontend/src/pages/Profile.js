import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Edit, Plus, Trash, Star, User, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
// Remove all useJsApiLoader, Autocomplete, and Google Maps API key logic
// Use plain input for address form:

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  // Address management state
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState({ street: '', city: '', state: '', zipCode: '', country: 'US', isDefault: false });
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressFormVisible, setAddressFormVisible] = useState(false);
  // Error states
  const [profileErrors, setProfileErrors] = useState({});
  const [profileApiError, setProfileApiError] = useState('');
  const [addressErrors, setAddressErrors] = useState({});
  const [addressApiError, setAddressApiError] = useState('');

  // Fetch addresses on mount
  useEffect(() => { fetchAddresses(); }, []);
  const fetchAddresses = async () => {
    try {
      const res = await api.get('/addresses');
      setAddresses(res.data.data);
    } catch (e) { /* ignore */ }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setProfileErrors(prev => ({ ...prev, [field]: '' }));
    setProfileApiError('');
  };

  const validateProfile = () => {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required';
    if (!formData.phone.trim()) errs.phone = 'Phone is required';
    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProfileApiError('');
    if (!validateProfile()) return;
    setLoading(true);
    try {
      const response = await api.put('/auth/profile', formData);
      updateUser(response.data.data);
      setEditing(false);
      toast.success('Profile updated');
    } catch (error) {
      setProfileApiError(error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Change password handlers
  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post('/auth/change-password', { oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword });
      toast.success('Password changed');
      setShowPasswordForm(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Address management handlers
  const handleAddressFormChange = (field, value) => {
    setAddressForm(prev => ({ ...prev, [field]: value }));
    setAddressErrors(prev => ({ ...prev, [field]: '' }));
    setAddressApiError('');
  };
  const validateAddress = () => {
    const errs = {};
    if (!addressForm.street.trim()) errs.street = 'Street is required';
    if (!addressForm.city.trim()) errs.city = 'City is required';
    if (!addressForm.state.trim()) errs.state = 'State is required';
    if (!addressForm.zipCode.trim()) errs.zipCode = 'ZIP code is required';
    if (!addressForm.country.trim()) errs.country = 'Country is required';
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressApiError('');
    if (!validateAddress()) return;
    setAddressLoading(true);
    try {
      if (editingAddressId) {
        await api.put(`/addresses/${editingAddressId}`, addressForm);
        toast.success('Address updated');
      } else {
        await api.post('/addresses', addressForm);
        toast.success('Address added');
      }
      setAddressForm({ street: '', city: '', state: '', zipCode: '', country: 'US', isDefault: false });
      setEditingAddressId(null);
      setAddressFormVisible(false);
      fetchAddresses();
    } catch (error) {
      setAddressApiError(error?.response?.data?.message || 'Failed to save address');
    } finally {
      setAddressLoading(false);
    }
  };
  const handleEditAddress = (address) => {
    setAddressForm({ ...address });
    setEditingAddressId(address.id);
    setAddressFormVisible(true);
  };
  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    setAddressLoading(true);
    try {
      await api.delete(`/addresses/${id}`);
      toast.success('Address deleted');
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to delete address');
    } finally {
      setAddressLoading(false);
    }
  };
  const handleSetDefault = async (id) => {
    setAddressLoading(true);
    try {
      await api.put(`/addresses/${id}`, { isDefault: true });
      toast.success('Default address set');
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to set default address');
    } finally {
      setAddressLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
              <button
                onClick={() => setEditing(!editing)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Edit className="h-4 w-4" />
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {profileApiError && <div className="mb-2 text-red-600 text-center text-sm font-medium">{profileApiError}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input type="text" value={formData.firstName} onChange={e => handleInputChange('firstName', e.target.value)} disabled={!editing} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50" />
                {profileErrors.firstName && <p className="mt-1 text-sm text-red-600">{profileErrors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input type="text" value={formData.lastName} onChange={e => handleInputChange('lastName', e.target.value)} disabled={!editing} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50" />
                {profileErrors.lastName && <p className="mt-1 text-sm text-red-600">{profileErrors.lastName}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" value={formData.email} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input type="tel" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} disabled={!editing} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50" />
              {profileErrors.phone && <p className="mt-1 text-sm text-red-600">{profileErrors.phone}</p>}
            </div>
            {editing && (
              <div className="flex justify-end">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </motion.button>
              </div>
            )}
          </form>
        </div>
        
        {/* Change Password Section */}
        <div className="bg-white rounded-lg shadow-sm mt-8">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
            <button onClick={() => setShowPasswordForm(!showPasswordForm)} className="text-blue-600 hover:text-blue-700 font-medium">{showPasswordForm ? 'Cancel' : 'Change Password'}</button>
          </div>
          {showPasswordForm && (
            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Old Password</label>
                <input type="password" value={passwordForm.oldPassword} onChange={e => handlePasswordChange('oldPassword', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input type="password" value={passwordForm.newPassword} onChange={e => handlePasswordChange('newPassword', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input type="password" value={passwordForm.confirmPassword} onChange={e => handlePasswordChange('confirmPassword', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div className="flex justify-end">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={passwordLoading} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">{passwordLoading ? 'Changing...' : 'Change Password'}</motion.button>
              </div>
            </form>
          )}
        </div>
        {/* Address Management Section */}
        <div className="bg-white rounded-lg shadow-sm mt-8">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Addresses</h2>
            <button onClick={() => { setAddressFormVisible(!addressFormVisible); setEditingAddressId(null); setAddressForm({ street: '', city: '', state: '', zipCode: '', country: 'US', isDefault: false }); }} className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"><Plus className="h-4 w-4" />{addressFormVisible && !editingAddressId ? 'Cancel' : 'Add Address'}</button>
          </div>
          {addressFormVisible && (
            <form onSubmit={handleAddressSubmit} className="p-6 space-y-4">
              {addressApiError && <div className="mb-2 text-red-600 text-center text-sm font-medium">{addressApiError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
                  {/* Remove all Google Maps Places Autocomplete integration */}
                  <input
                    type="text"
                    value={addressForm.street}
                    onChange={e => handleAddressFormChange('street', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="Start typing your address..."
                  />
                  {addressErrors.street && <p className="mt-1 text-sm text-red-600">{addressErrors.street}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input type="text" value={addressForm.city} onChange={e => handleAddressFormChange('city', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                  {addressErrors.city && <p className="mt-1 text-sm text-red-600">{addressErrors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input type="text" value={addressForm.state} onChange={e => handleAddressFormChange('state', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                  {addressErrors.state && <p className="mt-1 text-sm text-red-600">{addressErrors.state}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                  <input type="text" value={addressForm.zipCode} onChange={e => handleAddressFormChange('zipCode', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                  {addressErrors.zipCode && <p className="mt-1 text-sm text-red-600">{addressErrors.zipCode}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input type="text" value={addressForm.country} onChange={e => handleAddressFormChange('country', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                  {addressErrors.country && <p className="mt-1 text-sm text-red-600">{addressErrors.country}</p>}
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input type="checkbox" checked={addressForm.isDefault} onChange={e => handleAddressFormChange('isDefault', e.target.checked)} id="isDefault" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">Set as default</label>
                </div>
              </div>
              <div className="flex justify-end">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={addressLoading} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">{addressLoading ? (editingAddressId ? 'Updating...' : 'Adding...') : (editingAddressId ? 'Update Address' : 'Add Address')}</motion.button>
              </div>
            </form>
          )}
          <div className="p-6 space-y-4">
            {addresses.length === 0 && <div className="text-gray-500">No addresses found.</div>}
            {addresses.map(address => (
              <div key={address.id} className={`border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 ${address.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <div>
                  <div className="font-medium text-gray-900 flex items-center gap-2">{address.street} {address.isDefault && <span className="text-xs text-blue-600 flex items-center gap-1"><Star className="h-4 w-4" />Default</span>}</div>
                  <div className="text-gray-600 text-sm">{address.city}, {address.state} {address.zipCode}, {address.country}</div>
                </div>
                <div className="flex gap-2 mt-2 md:mt-0">
                  {!address.isDefault && <button onClick={() => handleSetDefault(address.id)} disabled={addressLoading} className="px-3 py-1 rounded bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">Set Default</button>}
                  <button onClick={() => handleEditAddress(address)} disabled={addressLoading} className="px-3 py-1 rounded bg-yellow-400 text-white text-sm font-medium hover:bg-yellow-500">Edit</button>
                  <button onClick={() => handleDeleteAddress(address.id)} disabled={addressLoading} className="px-3 py-1 rounded bg-red-500 text-white text-sm font-medium hover:bg-red-600"><Trash className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 