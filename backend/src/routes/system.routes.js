const express = require('express');
const router = express.Router();
const systemController = require('../controllers/system.controller');

/**
 * @route   GET /api/system/stats/dashboard
 * @desc    Get dashboard statistics for system
 * @access  Public
 */
router.get('/stats/dashboard', systemController.getDashboardStats);

/**
 * @route   GET /api/system/stats
 * @desc    Get general system statistics
 * @access  Public
 */
router.get('/stats', systemController.getSystemStats);

/**
 * @route   GET /api/system/stats/cashback
 * @desc    Get cashback statistics
 * @access  Public
 */
router.get('/stats/cashback', systemController.getCashbackStats);

module.exports = router;