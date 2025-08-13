const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema({
  report_date: {
    type: Date,
    required: true,
    unique: true
  },
  total_benefits_processed: {
    type: Number,
    required: true,
    default: 0
  },
  total_users_processed: {
    type: Number,
    required: true,
    default: 0
  },
  total_withdrawals: {
    type: Number,
    required: true,
    default: 0
  },
  available_balance: {
    type: Number,
    required: true,
    default: 0
  },
  liquidity_status: {
    type: String,
    enum: ['healthy', 'warning', 'critical'],
    required: true,
    default: 'healthy'
  },
  processing_time_ms: {
    type: Number,
    required: true,
    default: 0
  },
  errors_count: {
    type: Number,
    required: true,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true,
  collection: 'daily_reports'
});

// Índices
dailyReportSchema.index({ report_date: 1 }, { unique: true });
dailyReportSchema.index({ liquidity_status: 1 });
dailyReportSchema.index({ createdAt: 1 });

const DailyReport = mongoose.model('DailyReport', dailyReportSchema);

// Métodos estáticos
dailyReportSchema.statics.getLatestReport = async function() {
  return await this.findOne().sort({ report_date: -1 });
};

dailyReportSchema.statics.getReportsByDateRange = async function(startDate, endDate) {
  return await this.find({
    report_date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ report_date: -1 });
};

dailyReportSchema.statics.getLiquidityAlerts = async function(days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await this.find({
    report_date: { $gte: startDate },
    liquidity_status: { $in: ['warning', 'critical'] }
  }).sort({ report_date: -1 });
};

dailyReportSchema.statics.getAverageMetrics = async function(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const result = await this.aggregate([
    {
      $match: {
        report_date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        avg_benefits: { $avg: '$total_benefits_processed' },
        avg_withdrawals: { $avg: '$total_withdrawals' },
        avg_users: { $avg: '$total_users_processed' },
        avg_processing_time: { $avg: '$processing_time_ms' },
        total_reports: { $sum: 1 }
      }
    }
  ]);
  
  if (result[0]) {
    return {
      avg_benefits: result[0].avg_benefits || 0,
      avg_withdrawals: result[0].avg_withdrawals || 0,
      avg_users: result[0].avg_users || 0,
      avg_processing_time: result[0].avg_processing_time || 0,
      total_reports: result[0].total_reports || 0,
      period_days: days
    };
  }
  
  return null;
};

dailyReportSchema.statics.getTrends = async function(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await this.find(
    {
      report_date: { $gte: startDate }
    },
    {
      report_date: 1,
      total_benefits_processed: 1,
      total_withdrawals: 1,
      total_users_processed: 1,
      available_balance: 1,
      liquidity_status: 1
    }
  ).sort({ report_date: 1 });
};

module.exports = DailyReport;