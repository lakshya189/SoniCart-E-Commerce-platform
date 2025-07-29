import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCategoryIcon } from './CategoryIcons';

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

  return (
    <motion.div
      variants={animationVariants}
      whileHover={{ scale: 1.05 }}
      className={`group ${className}`}
    >
      <Link
        to={`/products?category=${category.slug}`}
        onClick={handleClick}
        className="block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
      >
        {showImage && category.image ? (
          <div className="aspect-square overflow-hidden">
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        ) : (
          <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 group-hover:from-blue-100 group-hover:to-indigo-200 transition-all duration-200">
            <div className="text-blue-600 group-hover:text-blue-700 transition-colors duration-200">
              {getCategoryIcon(category)}
            </div>
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
          {showProductCount && (
            <p className="text-sm text-gray-600">
              {category._count?.products || 0} products
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export default CategoryCard; 