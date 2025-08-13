const express = require('express');
const router = express.Router();
const { 
  getAvailablePackages,
  getUserPackages
} = require('../controllers/packageController.js');
const { authenticateToken } = require('../src/middleware/auth.middleware');

/**
 * @route   GET /api/packages
 * @desc    Get all available packages (licenses)
 * @access  Public
 */
router.get('/', getAvailablePackages);

/**
 * @route   GET /api/packages/user
 * @desc    Get user packages (licenses)
 * @access  Private
 */
router.get('/user', authenticateToken, getUserPackages);

/**
 * @route   GET /api/packages/user/:userId
 * @desc    Get packages (licenses) for a specific user (admin only)
 * @access  Private/Admin
 */
router.get('/user/:userId', authenticateToken, getUserPackages);

module.exports = router;