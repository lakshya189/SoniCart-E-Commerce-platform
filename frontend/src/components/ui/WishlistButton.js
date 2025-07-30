import React from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../contexts/WishlistContext';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

const WishlistButton = ({ 
  productId, 
  className = '', 
  size = 'md',
  showText = false,
  variant = 'default'
}) => {
  const { isInWishlist, toggleWishlist, loading } = useWishlist();
  const { isAuthenticated } = useAuth();

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      window.location.href = '/login';
      return;
    }

    await toggleWishlist(productId);
  };

  const isWishlisted = isInWishlist(productId);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variants = {
    default: 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300',
    filled: 'bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300',
    minimal: 'bg-transparent hover:bg-gray-50 border-0',
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
        sizeClasses[size],
        variants[variant],
        isWishlisted && 'bg-red-50 border-red-300',
        loading && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart
        className={cn(
          'transition-all duration-200',
          iconSizes[size],
          isWishlisted 
            ? 'fill-red-500 text-red-500' 
            : 'text-gray-400 hover:text-red-500'
        )}
      />
      {showText && (
        <span className="ml-2 text-sm font-medium">
          {isWishlisted ? 'Wishlisted' : 'Wishlist'}
        </span>
      )}
    </button>
  );
};

export default WishlistButton; 