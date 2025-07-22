import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Package, 
  Users, 
  ShoppingCart, 
  Settings, 
  LogOut,
  Menu,
  X,
  Home,
  ChevronRight,
  UserCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: BarChart3 },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Users', href: '/admin/users', icon: Users },
  ];

  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter(x => x);
    const breadcrumbs = [];
    
    if (pathnames[0] === 'admin') {
      breadcrumbs.push({ name: 'Admin', href: '/admin' });
      
      if (pathnames[1]) {
        const pageName = pathnames[1].charAt(0).toUpperCase() + pathnames[1].slice(1);
        breadcrumbs.push({ name: pageName, href: location.pathname });
      }
    }
    
    return breadcrumbs;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar removed: all navigation/actions are now in the header */}

      {/* Main content */}
      <div className="lg:pl-0">
        {/* Dark sticky header */}
        <header className="sticky top-0 z-20 w-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 border-b border-slate-800">
          <div className="flex items-center gap-4 w-full">
            {/* Hamburger menu for mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="sm:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            {/* Logo and title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-white">Admin Panel</span>
                <p className="text-xs text-slate-400">SonicArt Management</p>
              </div>
            </div>
            {/* Navigation links (desktop only) */}
            <nav className="hidden md:flex items-center gap-2 ml-8" aria-label="Header navigation">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 mr-2 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    {item.name}
                  </Link>
                );
              })}
              <Link
                to="/"
                className="btn btn-secondary flex items-center text-sm group ml-2"
              >
                <Home className="h-5 w-5 mr-2 text-slate-400 group-hover:text-white transition-colors" />
                Back to Store
              </Link>
            </nav>
            {/* Breadcrumbs (desktop only) */}
            <nav className="hidden md:flex items-center space-x-2 ml-6" aria-label="Breadcrumb">
              {getBreadcrumbs().map((breadcrumb, index) => (
                <div key={breadcrumb.href} className="flex items-center">
                  {index > 0 && <ChevronRight className="h-4 w-4 text-slate-400 mx-2" />}
                  <Link
                    to={breadcrumb.href}
                    className={`text-sm font-medium transition-colors ${
                      index === getBreadcrumbs().length - 1
                        ? 'text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {breadcrumb.name}
                  </Link>
                </div>
              ))}
            </nav>
            {/* User profile and logout (desktop only) */}
            <div className="hidden md:flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-2">
                <UserCircle className="h-8 w-8 text-blue-400" />
                <div className="text-white font-semibold text-sm">{user?.name || 'Admin User'}</div>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-danger flex items-center text-sm"
              >
                <LogOut className="h-5 w-5 mr-2" /> Logout
              </button>
            </div>
          </div>
        </header>
        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex">
            <div className="w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 h-full shadow-2xl flex flex-col">
              <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-7 w-7 text-white" />
                  <span className="text-lg font-bold text-white">Admin Panel</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-2" aria-label="Mobile navigation">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group text-slate-300 hover:bg-slate-700 hover:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5 mr-3 text-slate-400 group-hover:text-white transition-colors" />
                    {item.name}
                  </Link>
                ))}
                <Link
                  to="/"
                  className="btn btn-secondary flex items-center text-sm group"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Home className="h-5 w-5 mr-3 text-slate-400 group-hover:text-white transition-colors" />
                  Back to Store
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="btn btn-danger flex items-center w-full text-sm group mt-2"
                >
                  <LogOut className="h-5 w-5 mr-3 text-slate-400 group-hover:text-white transition-colors" />
                  Logout
                </button>
              </nav>
              {/* Breadcrumbs (mobile) */}
              <nav className="px-4 pb-4" aria-label="Breadcrumb">
                <div className="flex flex-wrap items-center text-xs text-slate-400">
                  {getBreadcrumbs().map((breadcrumb, index) => (
                    <span key={breadcrumb.href} className="flex items-center">
                      {index > 0 && <ChevronRight className="h-3 w-3 mx-1" />}
                      <Link
                        to={breadcrumb.href}
                        className={`font-medium ${index === getBreadcrumbs().length - 1 ? 'text-white' : 'hover:text-white'}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {breadcrumb.name}
                      </Link>
                    </span>
                  ))}
                </div>
              </nav>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}
        {/* Page content */}
        <main className="p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 