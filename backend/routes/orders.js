const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { protect, authorize } = require('../middleware/auth');
const { io } = require('../server');
const { sendMail } = require('../utils/mail');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();
const prisma = new PrismaClient();

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
router.get('/', protect, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
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
      limit = 10,
      status,
    } = req.query;

    const skip = (page - 1) * limit;

    const where = {
      userId: req.user.id,
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          orderItems: {
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
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: orders,
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
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                price: true,
                sku: true,
              },
            },
          },
        },
        addresses: true, // Only include addresses
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Helper: Validate address object
function validateAddress(address, type = 'Address') {
  const requiredFields = ['street', 'city', 'state', 'zipCode', 'country'];
  for (const field of requiredFields) {
    if (!address[field] || typeof address[field] !== 'string' || !address[field].trim()) {
      return `${type} field '${field}' is required`;
    }
  }
  return null;
}

// Helper: Validate cart items
function validateCartItems(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return 'Cart is empty';
  }
  for (const item of cartItems) {
    if (!item.product || typeof item.product.price === 'undefined') {
      return `Invalid product in cart`;
    }
    if (item.product.stock < item.quantity) {
      return `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}`;
    }
  }
  return null;
}

// @desc    Create order
// @route   POST /api/orders
// @access  Private
router.post('/', protect, [
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('billingAddress').isObject().withMessage('Billing address is required'),
  body('paymentIntentId').custom((value, { req }) => {
    if (req.body.paymentMethod !== 'cod' && !value) {
      throw new Error('Payment intent ID is required');
    }
    return true;
  }),
  body('notes').optional().isString(),
], async (req, res) => {
  try {
    console.log('POST /api/orders request body:', JSON.stringify(req.body, null, 2));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      shippingAddress,
      billingAddress,
      paymentIntentId,
      notes,
      paymentMethod, // 'card', 'paypal', 'cod'
      paypalOrderId,
      paypalPayer,
    } = req.body;

    // Validate addresses
    const shippingError = validateAddress(shippingAddress, 'Shipping address');
    if (shippingError) {
      return res.status(400).json({ success: false, message: shippingError });
    }
    const billingError = validateAddress(billingAddress, 'Billing address');
    if (billingError) {
      return res.status(400).json({ success: false, message: billingError });
    }

    // Get user's cart
    let cartItems;
    try {
      cartItems = await prisma.cartItem.findMany({
        where: { userId: req.user.id },
        include: { product: true },
      });
    } catch (err) {
      console.error('Error fetching cart items:', err);
      return res.status(500).json({ success: false, message: 'Error fetching cart items' });
    }
    console.log('User cart items:', cartItems);

    // Validate cart
    const cartError = validateCartItems(cartItems);
    if (cartError) {
      return res.status(400).json({ success: false, message: cartError });
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const total = subtotal + tax + shipping;

    // CARD PAYMENT: Validate paymentIntentId and check payment status
    let paymentStatus = 'PENDING';
    /*
    // Stripe logic temporarily disabled for development/testing
    if (paymentMethod === 'card') {
      if (!paymentIntentId) {
        return res.status(400).json({ success: false, message: 'Payment intent ID is required for card payments.' });
      }
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (!paymentIntent) {
          return res.status(400).json({ success: false, message: 'Invalid payment intent ID.' });
        }
        if (paymentIntent.status === 'succeeded') {
          paymentStatus = 'PAID';
        } else {
          return res.status(400).json({ success: false, message: `Payment not completed. Status: ${paymentIntent.status}` });
        }
      } catch (err) {
        console.error('Stripe payment intent retrieve error:', err);
        return res.status(500).json({ success: false, message: 'Error verifying payment intent', stripeError: err.message });
      }
    }
    */
    // For development/testing, mark as PAID for card, PENDING for cod
    if (paymentMethod === 'card') {
      paymentStatus = 'PAID';
    }

    // Create order in transaction
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        // 1. Create the order (without shipping/billing address fields)
        const newOrder = await tx.order.create({
          data: {
            userId: req.user.id,
            total,
            subtotal,
            tax,
            shipping,
            paymentIntentId,
            notes,
            paymentMethod: paymentMethod || 'card',
            paymentStatus: paymentStatus, // set based on payment
            paypalOrderId: paypalOrderId || null,
            paypalPayer: paypalPayer ? JSON.stringify(paypalPayer) : null,
          },
        });

        // 2. Create shipping and billing addresses as OrderAddress records
        const shippingAddr = await tx.orderAddress.create({
          data: {
            orderId: newOrder.id,
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            zipCode: shippingAddress.zipCode,
            country: shippingAddress.country || 'US',
            type: 'SHIPPING',
          },
        });
        const billingAddr = await tx.orderAddress.create({
          data: {
            orderId: newOrder.id,
            street: billingAddress.street,
            city: billingAddress.city,
            state: billingAddress.state,
            zipCode: billingAddress.zipCode,
            country: billingAddress.country || 'US',
            type: 'BILLING',
          },
        });

        // 3. Create order items and update stock
        const orderItems = [];
        for (const item of cartItems) {
          const orderItem = await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            },
          });

          // Update product stock
          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
          // Emit real-time stock update
          if (io) io.emit('productStockUpdated', { productId: item.productId, stock: updatedProduct.stock });

          orderItems.push(orderItem);
        }

        // 4. Clear cart
        await tx.cartItem.deleteMany({
          where: { userId: req.user.id },
        });

        return {
          ...newOrder,
          orderItems,
          shippingAddress: shippingAddr,
          billingAddress: billingAddr,
        };
      });
    } catch (err) {
      console.error('Order transaction error:', err);
      return res.status(500).json({ success: false, message: 'Error creating order' });
    }

    res.status(201).json({
      success: true,
      data: order,
    });
    // Send order confirmation email
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      await sendMail({
        to: user.email,
        subject: `Order Confirmation - SonicArt Order #${order.id.slice(-8)}`,
        html: `<h2>Thank you for your order!</h2>\n<p>Your order <b>#${order.id.slice(-8)}</b> has been placed successfully.</p>\n<p>Total: <b>$${order.total}</b></p>\n<p>We will notify you when your order ships.</p>`,
      });
    } catch (e) {
      console.error('Order email error:', e);
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
router.put('/:id/status', protect, authorize('ADMIN'), [
  body('status').isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).withMessage('Invalid status'),
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
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        orderItems: {
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
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: order,
    });
    // Emit real-time order status update
    if (io) io.emit('orderStatusUpdated', { orderId: order.id, status: order.status });

    // Send cancellation email if order is cancelled
    if (status === 'CANCELLED') {
      try {
        await sendMail({
          to: order.user.email,
          subject: `Order Cancelled - SonicArt Order #${order.id.slice(-8)}`,
          html: `<h2>Your order has been cancelled.</h2>
                <p>Order <b>#${order.id.slice(-8)}</b> was cancelled successfully.</p>
                <p>If you have any questions, please contact our support team.</p>`
        });
      } catch (e) {
        console.error('Order cancellation email error:', e);
      }
    }
  } catch (error) {
    console.error('Update order status error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @desc    Get all orders (Admin only)
// @route   GET /api/orders/admin/all
// @access  Private/Admin
router.get('/admin/all', protect, authorize('ADMIN'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  query('search').optional().isString(),
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
      limit = 20,
      status,
      search,
    } = req.query;

    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          orderItems: {
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
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: orders,
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
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router; 