import React from 'react';
import { motion } from 'framer-motion';
import CategoryCard from './CategoryCard';
import LoadingSpinner from './LoadingSpinner';

const CategoryGrid = ({
  categories = [],
  loading = false,
  error = null,
  className = "",
  gridCols = "grid-cols-2 md:grid-cols-4",
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">{loadingMessage}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">⚠️</div>
        <p className="text-gray-600">{errorMessage}</p>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">📁</div>
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`grid ${gridCols} ${gap} ${className}`}
    >
      {categories.map((category) => (
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
  );
};

export default CategoryGrid; 