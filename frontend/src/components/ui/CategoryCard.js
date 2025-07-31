import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCategoryIcon } from './CategoryIcons';

// Color themes for each category
const categoryThemes = {
  electronics: {
    gradient: 'from-blue-500 via-cyan-500 to-blue-600',
    hover: 'from-blue-600 via-cyan-600 to-blue-700',
    bg: 'from-blue-50 to-cyan-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  gifting: {
    gradient: 'from-pink-500 via-rose-500 to-pink-600',
    hover: 'from-pink-600 via-rose-600 to-pink-700',
    bg: 'from-pink-50 to-rose-50',
    text: 'text-pink-700',
    border: 'border-pink-200'
  },
  households: {
    gradient: 'from-green-500 via-emerald-500 to-green-600',
    hover: 'from-green-600 via-emerald-600 to-green-700',
    bg: 'from-green-50 to-emerald-50',
    text: 'text-green-700',
    border: 'border-green-200'
  },
  toys: {
    gradient: 'from-yellow-500 via-orange-500 to-yellow-600',
    hover: 'from-yellow-600 via-orange-600 to-yellow-700',
    bg: 'from-yellow-50 to-orange-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200'
  },
  fashion: {
    gradient: 'from-purple-500 via-violet-500 to-purple-600',
    hover: 'from-purple-600 via-violet-600 to-purple-700',
    bg: 'from-purple-50 to-violet-50',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  books: {
    gradient: 'from-indigo-500 via-blue-500 to-indigo-600',
    hover: 'from-indigo-600 via-blue-600 to-indigo-700',
    bg: 'from-indigo-50 to-blue-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200'
  },
  sports: {
    gradient: 'from-red-500 via-pink-500 to-red-600',
    hover: 'from-red-600 via-pink-600 to-red-700',
    bg: 'from-red-50 to-pink-50',
    text: 'text-red-700',
    border: 'border-red-200'
  },
  beauty: {
    gradient: 'from-fuchsia-500 via-purple-500 to-fuchsia-600',
    hover: 'from-fuchsia-600 via-purple-600 to-fuchsia-700',
    bg: 'from-fuchsia-50 to-purple-50',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200'
  }
};

// Get theme for category
const getCategoryTheme = (category) => {
  const slug = category?.slug?.toLowerCase();
  return categoryThemes[slug] || categoryThemes.electronics;
};

const CategoryCard = ({ 
  category, 
  className = "", 
  showImage = true,
  showProductCount = true,
  animationVariants = null,
  onCardClick = null 
}) => {
  const handleClick = (e) => {
    if (onCardClick) {
      e.preventDefault();
      onCardClick(category);
    }
  };

  const theme = getCategoryTheme(category);

  return (
    <motion.div
      variants={animationVariants}
      whileHover={{ 
        scale: 1.05,
        rotateY: 5,
        rotateX: 2,
        boxShadow: "0 25px 50px rgba(0,0,0,0.15)"
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ 
        type: "spring", 
        stiffness: 300,
        damping: 20
      }}
      className={`group relative ${className}`}
    >
      <Link
        to={`/products?category=${category.slug}`}
        onClick={handleClick}
        className="block relative overflow-hidden rounded-2xl"
      >
        {/* Glassmorphism Card Background */}
        <div className={`relative backdrop-blur-md bg-white/80 border ${theme.border} rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500`}>
          
          {/* Gradient Border Effect */}
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-300`}></div>
          
          {/* Card Content */}
          <div className="relative p-6">
            
                         {/* Icon Section */}
             <div className="flex items-center justify-center mb-6">
               <motion.div
                 whileHover={{ rotate: 360 }}
                 transition={{ duration: 0.6 }}
                 className={`w-20 h-20 bg-gradient-to-br ${theme.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}
               >
                 <div className="text-white">
                   {getCategoryIcon(category)}
                 </div>
               </motion.div>
             </div>

                         {/* Category Info */}
             <div className="text-center">
               <h3 className={`text-xl font-bold ${theme.text} group-hover:scale-105 transition-transform duration-300`}>
                 {category.name}
               </h3>
             </div>


          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default CategoryCard; 