const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { protect, authorize } = require('../middleware/auth');
// Removed: const { cacheMiddleware, invalidateCache } = require('../utils/cache');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isString(),
  query('search').optional().isString(),
  query('sort').optional().isIn(['price_asc', 'price_desc', 'name_asc', 'name_desc', 'created_desc']),
  query('featured').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      page = 1,
      limit = 12,
      category,
      search,
      sort = 'created_desc',
      featured,
    } = req.query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      isActive: true,
      ...(category && { category: { slug: category } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(featured && { isFeatured: true }),
    };

    // Build order by clause
    let orderBy = {};
    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'name_asc':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        orderBy,
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate average rating for each product
    const productsWithRating = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

      return {
        ...product,
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: product.reviews.length,
        reviews: undefined, // Remove reviews array from response
      };
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: productsWithRating,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Calculate average rating
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;

    const productWithRating = {
      ...product,
      averageRating: Math.round(avgRating * 10) / 10,
      reviewCount: product.reviews.length,
    };

    res.json({
      success: true,
      data: productWithRating,
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
router.post('/', protect, authorize('ADMIN'), upload.array('images', 5), async (req, res) => {
  try {
    // Parse form fields
    const { name, description, price, comparePrice, categoryId, stock, sku, weight, dimensions, isFeatured } = req.body;
    // Validate required fields
    if (!name || !description || !price || !categoryId || !stock) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    // Check if category exists
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(400).json({ success: false, message: 'Category not found' });
    }
    // Handle images
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    }
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        categoryId,
        stock: parseInt(stock),
        sku,
        images: imageUrls,
        weight: weight ? parseFloat(weight) : null,
        dimensions,
        isFeatured: isFeatured === 'true' || isFeatured === true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('ADMIN'), [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('categoryId').optional().notEmpty(),
  body('stock').optional().isInt({ min: 0 }),
  body('images').optional().isArray(),
  body('isActive').optional().isBoolean(),
  body('isFeatured').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    // Convert numeric fields
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.comparePrice) updateData.comparePrice = parseFloat(updateData.comparePrice);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);
    if (updateData.weight) updateData.weight = parseFloat(updateData.weight);

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Invalidate product cache
    // Removed: await invalidateCache.products();

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id },
    });

    // Invalidate product cache
    // Removed: await invalidateCache.products();

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Admin: Get all pending reviews
router.get('/reviews/moderation/pending', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        product: { select: { id: true, name: true, images: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Approve a review
router.put('/reviews/:reviewId/approve', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'APPROVED' },
    });
    res.json({ success: true, data: review });
  } catch (error) {
    console.error('Approve review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Reject a review
router.put('/reviews/:reviewId/reject', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'REJECTED' },
    });
    res.json({ success: true, data: review });
  } catch (error) {
    console.error('Reject review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// User: Flag/report a review (set status to PENDING)
router.put('/reviews/:reviewId/flag', protect, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'PENDING' },
    });
    res.json({ success: true, data: review });
  } catch (error) {
    console.error('Flag review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get product reviews
// @route   GET /api/products/:id/reviews
// @access  Public
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const reviews = await prisma.review.findMany({
      where: { productId: id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Create product review
// @route   POST /api/products/:id/reviews
// @access  Private
router.post('/:id/reviews', protect, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isString().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId: id,
        },
      },
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        userId: req.user.id,
        productId: id,
        rating,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Update product review
// @route   PUT /api/products/:id/reviews
// @access  Private
router.put('/:id/reviews', protect, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isString().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Find existing review
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId: id,
        },
      },
    });

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Update review
    const review = await prisma.review.update({
      where: { id: existingReview.id },
      data: {
        rating,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Delete product review
// @route   DELETE /api/products/:id/reviews
// @access  Private
router.delete('/:id/reviews', protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Find existing review
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId: id,
        },
      },
    });

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Delete review
    await prisma.review.delete({
      where: { id: existingReview.id },
    });

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router; 