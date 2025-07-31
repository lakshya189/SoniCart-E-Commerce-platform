import React from 'react';
import { motion } from 'framer-motion';
import CategoryCard from './CategoryCard';
import LoadingSpinner from './LoadingSpinner';

const CategoryGrid = ({
  categories = [],
  loading = false,
  error = null,
  className = "",
  gridCols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  gap = "gap-6",
  showImage = true,
  showProductCount = true,
  animationVariants = null,
  onCardClick = null,
  emptyMessage = "No categories found",
  loadingMessage = "Loading categories...",
  errorMessage = "Failed to load categories"
}) => {
  const containerVariants = animationVariants || {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      },
    },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 text-lg">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-500 mb-4 text-6xl">⚠️</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
        <p className="text-gray-600">{errorMessage}</p>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-gray-400 mb-4 text-6xl">📁</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Categories Found</h3>
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-white/50 rounded-3xl"></div>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`relative grid ${gridCols} ${gap} ${className}`}
      >
        {categories.map((category, index) => (
          <CategoryCard
            key={category.id}
            category={category}
            showImage={showImage}
            showProductCount={showProductCount}
            animationVariants={itemVariants}
            onCardClick={onCardClick}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default CategoryGrid; 