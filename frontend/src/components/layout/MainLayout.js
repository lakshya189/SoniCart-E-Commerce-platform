import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const MainLayout = ({ children }) => {
  const location = useLocation();
  
  // Routes where we don't want to show header and footer
  const authRoutes = ['/login', '/register', '/reset-password'];
  const isAuthRoute = authRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!isAuthRoute && <Header />}
      
      <main className={`flex-1 ${isAuthRoute ? 'min-h-screen' : ''}`}>
        {children}
      </main>
      
      {!isAuthRoute && <Footer />}
    </div>
  );
};

export default MainLayout; 