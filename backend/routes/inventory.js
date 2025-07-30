const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user's inventory alerts
// @route   GET /api/inventory/alerts
// @access  Private
router.get('/alerts', protect, async (req, res) => {
  try {
    const alerts = await prisma.inventoryAlert.findMany({
      where: { userId: req.user.id, isActive: true },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            images: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error('Get inventory alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Create inventory alert
// @route   POST /api/inventory/alerts
// @access  Private
router.post('/alerts', protect, [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('type').isIn(['LOW_STOCK', 'OUT_OF_STOCK', 'BACK_IN_STOCK']).withMessage('Invalid alert type'),
  body('threshold').isInt({ min: 0 }).withMessage('Threshold must be a positive number'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { productId, type, threshold } = req.body;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stock: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if alert already exists
    const existingAlert = await prisma.inventoryAlert.findFirst({
      where: {
        userId: req.user.id,
        productId,
        type,
        isActive: true,
      },
    });

    if (existingAlert) {
      return res.status(400).json({
        success: false,
        message: 'Alert already exists for this product',
      });
    }

    // Create alert
    const alert = await prisma.inventoryAlert.create({
      data: {
        userId: req.user.id,
        productId,
        type,
        threshold,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            images: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: alert,
      message: 'Inventory alert created successfully',
    });
  } catch (error) {
    console.error('Create inventory alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Delete inventory alert
// @route   DELETE /api/inventory/alerts/:id
// @access  Private
router.delete('/alerts/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.inventoryAlert.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    await prisma.inventoryAlert.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    console.error('Delete inventory alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Get user's stock notifications
// @route   GET /api/inventory/notifications
// @access  Private
router.get('/notifications', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.stockNotification.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              images: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.stockNotification.count({ where }),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalNotifications: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Mark notification as read
// @route   PATCH /api/inventory/notifications/:id/read
// @access  Private
router.patch('/notifications/:id/read', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.stockNotification.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    await prisma.stockNotification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Mark all notifications as read
// @route   PATCH /api/inventory/notifications/read-all
// @access  Private
router.patch('/notifications/read-all', protect, async (req, res) => {
  try {
    await prisma.stockNotification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Get unread notification count
// @route   GET /api/inventory/notifications/unread-count
// @access  Private
router.get('/notifications/unread-count', protect, async (req, res) => {
  try {
    const count = await prisma.stockNotification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Admin: Get low stock products
// @route   GET /api/inventory/low-stock
// @access  Admin
router.get('/low-stock', protect, admin, async (req, res) => {
  try {
    const { threshold = 10 } = req.query;

    const products = await prisma.product.findMany({
      where: {
        stock: { lte: parseInt(threshold) },
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
      orderBy: { stock: 'asc' },
    });

    res.json({
      success: true,
      data: products,
      threshold: parseInt(threshold),
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router; 