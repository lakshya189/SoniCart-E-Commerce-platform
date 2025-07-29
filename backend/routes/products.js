const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../public/uploads');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Ensure consistent file extension
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, JPG, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  }
}).array('images', 5);

// Error handling middleware for multer
const handleMulterErrors = (err, req, res, next) => {
  if (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB per file.'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 5 files allowed.'
        });
      }
    } else if (err.message) {
      // Custom error from fileFilter
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // For any other errors
    console.error('File upload error:', err);
    return res.status(500).json({
      success: false,
      message: 'File upload failed. Please try again.'
    });
  }
  next();
};

// Apply the error handling middleware
router.use(handleMulterErrors);

// Middleware to optionally authenticate a user
const getAuthUser = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Select only necessary fields for this check
      req.user = await prisma.user.findUnique({ 
        where: { id: decoded.id },
        select: { id: true, role: true }
      });
    } catch (error) {
      req.user = null; // Ignore errors, just means user is not authenticated
    }
  }
  next();
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get('/', getAuthUser, [
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
      ...(category && { category: { slug: category } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(featured && { isFeatured: true }),
    };

    // For non-admin users, only show active products. Admins see all.
    if (req.user?.role !== 'ADMIN') {
      where.isActive = true;
    }

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
router.post('/', protect, authorize('ADMIN'), (req, res, next) => {
  console.log('Product creation request from:', req.user?.email);
  
  // Handle the upload first
  upload(req, res, async (err) => {
    try {
      // Handle multer errors
      if (err) {
        console.error('File upload error:', err);
        return handleMulterErrors(err, req, res, next);
      }

      console.log('Files uploaded:', req.files ? req.files.length : 0);

      // Parse form fields
      const { 
        name, 
        description, 
        price, 
        comparePrice, 
        categoryId, 
        stock, 
        sku, 
        weight, 
        dimensions, 
        isFeatured,
        status // Added from frontend form
      } = req.body;

      // Validate required fields
      if (!name || !description || !price || !categoryId || !stock) {
        const missingFields = {
          name: !name,
          description: !description,
          price: !price,
          categoryId: !categoryId,
          stock: !stock
        };
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields',
          missing: missingFields
        });
      }

      // Check if category exists
      const category = await prisma.category.findUnique({ 
        where: { id: categoryId } 
      });
      
      if (!category) {
        return res.status(400).json({ 
          success: false, 
          message: 'Category not found' 
        });
      }

      // Process uploaded files
      let imageUrls = [];
      if (req.files && req.files.length > 0) {
        imageUrls = req.files.map(file => `/uploads/${file.filename}`);
      } else {
        return res.status(400).json({
          success: false,
          message: 'At least one image is required'
        });
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          name,
          description,
          price: parseFloat(price),
          comparePrice: comparePrice ? parseFloat(comparePrice) : null,
          categoryId,
          stock: parseInt(stock),
          sku: sku || null,
          images: imageUrls,
          weight: weight ? parseFloat(weight) : null,
          dimensions: dimensions || null,
          isFeatured: isFeatured === 'true' || isFeatured === true,
          isActive: status === 'Active', // Convert status string to boolean
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

      console.log('Product created successfully:', product.id);
      res.status(201).json({ 
        success: true, 
        data: product 
      });

    } catch (error) {
      console.error('Create product error:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta,
      });
      
      // Clean up uploaded files if product creation fails
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          try {
            fs.unlinkSync(path.join(uploadsDir, file.filename));
          } catch (unlinkError) {
            console.error('Error cleaning up uploaded file:', unlinkError);
          }
        });
      }

      // Handle Prisma errors
      if (error.code === 'P2002') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'A product with this SKU or name already exists',
          field: error.meta?.target?.[0] || 'unknown'
        });
      }

      res.status(500).json({ 
        success: false, 
        message: 'Failed to create product',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('ADMIN'), (req, res, next) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        return handleMulterErrors(err, req, res, next);
      }

      const { id } = req.params;
      const {
        name,
        description,
        price,
        comparePrice,
        categoryId,
        stock,
        sku,
        weight,
        dimensions,
        isFeatured,
        isActive,
        existingImages // Expect a comma-separated string of URLs for images to keep
      } = req.body;

      const existingProduct = await prisma.product.findUnique({ where: { id } });
      if (!existingProduct) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Process new images
      let newImageUrls = [];
      if (req.files && req.files.length > 0) {
        newImageUrls = req.files.map(file => `/uploads/${file.filename}`);
      }

      // Combine existing and new images
      const keptImages = existingImages ? existingImages.split(',').filter(img => img) : [];
      const allImages = [...keptImages, ...newImageUrls];

      // Identify images to delete from filesystem
      const imagesToDelete = existingProduct.images.filter(img => !keptImages.includes(img));
      imagesToDelete.forEach(imgUrl => {
        const imagePath = path.join(__dirname, '../public', imgUrl);
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.error('Error cleaning up uploaded file:', err);
          } else {
            console.warn('File not found during deletion (ignored):', imagePath);
          }
        }
      });

      const updateData = {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
        categoryId,
        stock: stock ? parseInt(stock) : undefined,
        sku,
        images: allImages,
        weight: weight ? parseFloat(weight) : undefined,
        dimensions,
        isFeatured: isFeatured ? (isFeatured === 'true' || isFeatured === true) : undefined,
        isActive: isActive ? (isActive === 'true' || isActive === true) : undefined,
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

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