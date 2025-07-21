const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { protect } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// @desc    Create return request
// @route   POST /api/returns
// @access  Private
router.post('/', protect, [
  body('orderId').isString().notEmpty(),
  body('reason').isString().notEmpty(),
  body('items').isArray().notEmpty(),
  body('items.*.orderItemId').isString().notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.reason').isString().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { orderId, reason, items } = req.body;
    const userId = req.user.id;

    // Verify order exists and belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: { in: ['DELIVERED', 'SHIPPED'] },
      },
      include: {
        orderItems: {
          where: {
            id: { in: items.map(item => item.orderItemId) }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not eligible for return',
      });
    }

    // Create return request
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId,
        userId,
        reason,
        status: 'PENDING',
        returnItems: {
          create: items.map(item => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            reason: item.reason,
            status: 'PENDING',
          })),
        },
      },
      include: {
        returnItems: true,
      },
    });

    res.status(201).json({
      success: true,
      data: returnRequest,
    });
  } catch (error) {
    console.error('Create return request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Get user's return requests
// @route   GET /api/returns
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const returnRequests = await prisma.returnRequest.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        returnItems: {
          include: {
            orderItem: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                  },
                },
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: returnRequests,
    });
  } catch (error) {
    console.error('Get return requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Get single return request
// @route   GET /api/returns/:id
// @access  Private
router.get('/:id', protect, [
  param('id').isString().notEmpty(),
], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const returnRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        returnItems: {
          include: {
            orderItem: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found',
      });
    }

    res.json({
      success: true,
      data: returnRequest,
    });
  } catch (error) {
    console.error('Get return request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Cancel return request
// @route   PUT /api/returns/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, [
  param('id').isString().notEmpty(),
], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const returnRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        userId,
        status: 'PENDING',
      },
    });

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found or cannot be cancelled',
      });
    }

    const updatedRequest = await prisma.returnRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({
      success: true,
      data: updatedRequest,
    });
  } catch (error) {
    console.error('Cancel return request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;
