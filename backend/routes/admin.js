const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Example: Admin dashboard route
router.get('/dashboard', protect, authorize('admin'), (req, res) => {
  res.json({ success: true, message: 'Welcome to the Admin Dashboard!' });
});

// Placeholder for future admin routes
// e.g., router.get('/stats', ...), router.post('/settings', ...)

module.exports = router; 