const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Example: Admin dashboard route
router.get('/dashboard', protect, authorize('admin'), (req, res) => {
  res.json({ success: true, message: 'Welcome to the Admin Dashboard!' });
});

// @desc    Get wishlist analytics
// @route   GET /api/admin/wishlist
// @access  Private/Admin
router.get('/wishlist', protect, authorize('admin'), async (req, res) => {
  try {
    // Get all wishlist items with user and product data
    const wishlistItems = await prisma.wishlistItem.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate statistics
    const totalWishlistItems = wishlistItems.length;
    const uniqueUsers = new Set(wishlistItems.map(item => item.userId)).size;
    const averageItemsPerUser = uniqueUsers > 0 ? totalWishlistItems / uniqueUsers : 0;

    // Find most wishlisted product
    const productCounts = {};
    wishlistItems.forEach(item => {
      const productId = item.productId;
      productCounts[productId] = (productCounts[productId] || 0) + 1;
    });

    let mostWishlistedProduct = null;
    let maxCount = 0;
    for (const [productId, count] of Object.entries(productCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostWishlistedProduct = wishlistItems.find(item => item.productId === productId)?.product;
      }
    }

    const stats = {
      totalWishlistItems,
      totalUsers: uniqueUsers,
      averageItemsPerUser,
      mostWishlistedProduct,
    };

    res.json({
      success: true,
      data: wishlistItems,
      stats,
    });
  } catch (error) {
    console.error('Admin wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router; 