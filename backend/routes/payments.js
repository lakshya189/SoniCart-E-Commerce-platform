const express = require('express');
const { body, validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Create payment intent
// @route   POST /api/payments/create-payment-intent
// @access  Private
router.post('/create-payment-intent', protect, [
  body('amount').isFloat({ min: 0.5 }).withMessage('Amount must be at least $0.50'),
  body('currency').optional().isIn(['usd', 'eur', 'gbp']).withMessage('Invalid currency'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { amount, currency = 'usd' } = req.body;

    if (typeof amount !== 'number' || isNaN(amount) || amount < 0.5) {
      return res.status(400).json({ success: false, message: 'Invalid amount for payment intent.' });
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency,
        metadata: {
          userId: req.user.id,
          userEmail: req.user.email,
        },
      });
    } catch (err) {
      console.error('Stripe payment intent error:', err);
      return res.status(500).json({ success: false, message: 'Error creating payment intent', stripeError: err.message });
    }

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment intent',
    });
  }
});

// @desc    Confirm payment
// @route   POST /api/payments/confirm
// @access  Private
router.post('/confirm', protect, [
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { paymentIntentId } = req.body;

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Payment intent does not belong to this user',
      });
    }

    res.json({
      success: true,
      data: {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      },
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming payment',
    });
  }
});

// @desc    Webhook handler
// @route   POST /api/payments/webhook
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      // Here you could update order status, send confirmation emails, etc.
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      // Here you could update order status, send failure notifications, etc.
      break;

    case 'charge.succeeded':
      const charge = event.data.object;
      console.log('Charge succeeded:', charge.id);
      break;

    case 'charge.failed':
      const failedCharge = event.data.object;
      console.log('Charge failed:', failedCharge.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// @desc    Get payment methods
// @route   GET /api/payments/methods
// @access  Private
router.get('/methods', protect, async (req, res) => {
  try {
    // In a real application, you would store customer IDs in your database
    // For now, we'll create a customer ID based on the user ID
    const customerId = `customer_${req.user.id}`;

    let customer;
    try {
      customer = await stripe.customers.retrieve(customerId);
    } catch (error) {
      if (error.code === 'resource_missing') {
        // Create customer if doesn't exist
        customer = await stripe.customers.create({
          id: customerId,
          email: req.user.email,
          name: `${req.user.firstName} ${req.user.lastName}`,
        });
      } else {
        throw error;
      }
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });

    res.json({
      success: true,
      data: paymentMethods.data,
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving payment methods',
    });
  }
});

// @desc    Add payment method
// @route   POST /api/payments/methods
// @access  Private
router.post('/methods', protect, [
  body('paymentMethodId').notEmpty().withMessage('Payment method ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { paymentMethodId } = req.body;
    const customerId = `customer_${req.user.id}`;

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    res.json({
      success: true,
      message: 'Payment method added successfully',
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding payment method',
    });
  }
});

// @desc    Remove payment method
// @route   DELETE /api/payments/methods/:id
// @access  Private
router.delete('/methods/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Detach payment method
    await stripe.paymentMethods.detach(id);

    res.json({
      success: true,
      message: 'Payment method removed successfully',
    });
  } catch (error) {
    console.error('Remove payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing payment method',
    });
  }
});

module.exports = router; 