const express = require('express');
const { getDashboardStats } = require('../../controllers/admin/dashboard.controller');

const router = express.Router();

// All routes here are already protected by admin middleware from parent router

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin)
 */
router.get('/stats', getDashboardStats);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get main dashboard data (alias for stats)
 * @access  Private (Admin)
 */
router.get('/', getDashboardStats);

module.exports = router;