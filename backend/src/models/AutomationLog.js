const mongoose = require('mongoose');

const automationLogSchema = new mongoose.Schema({
  job_name: {
    type: String,
    required: true,
    maxlength: 100
  },
  job_type: {
    type: String,
    enum: ['benefits', 'pioneer', 'reports', 'cleanup', 'notifications', 'monitoring', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'retrying', 'cancelled'],
    required: true
  },
  trigger_type: {
    type: String,
    enum: ['automatic', 'manual', 'retry'],
    required: true,
    default: 'automatic'
  },
  start_time: {
    type: Date,
    required: true
  },
  end_time: {
    type: Date,
    default: null
  },
  duration_ms: {
    type: Number,
    default: null
  },
  records_processed: {
    type: Number,
    required: true,
    default: 0
  },
  error_message: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true,
  collection: 'automation_logs'
});

// Índices
automationLogSchema.index({ job_name: 1 });
automationLogSchema.index({ job_type: 1 });
automationLogSchema.index({ status: 1 });
automationLogSchema.index({ start_time: 1 });
automationLogSchema.index({ createdAt: 1 });
automationLogSchema.index({ job_name: 1, start_time: 1 });

const AutomationLog = mongoose.model('AutomationLog', automationLogSchema);

// Métodos de instancia
automationLogSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // Calcular duración si no está establecida pero hay end_time
  if (!obj.duration_ms && obj.end_time && obj.start_time) {
    obj.duration_ms = new Date(obj.end_time) - new Date(obj.start_time);
  }
  
  return obj;
};

automationLogSchema.methods.markAsCompleted = async function(recordsProcessed = 0, metadata = null) {
  const endTime = new Date();
  const duration = endTime - new Date(this.start_time);
  
  this.status = 'completed';
  this.end_time = endTime;
  this.duration_ms = duration;
  this.records_processed = recordsProcessed;
  this.metadata = metadata;
  
  return await this.save();
};

automationLogSchema.methods.markAsFailed = async function(errorMessage, metadata = null) {
  const endTime = new Date();
  const duration = endTime - new Date(this.start_time);
  
  this.status = 'failed';
  this.end_time = endTime;
  this.duration_ms = duration;
  this.error_message = errorMessage;
  this.metadata = metadata;
  
  return await this.save();
};

// Métodos estáticos
automationLogSchema.statics.getRecentLogs = async function(limit = 50) {
  return await this.find().sort({ start_time: -1 }).limit(limit);
};

automationLogSchema.statics.getLogsByJob = async function(jobName, limit = 20) {
  return await this.find({ job_name: jobName })
    .sort({ start_time: -1 })
    .limit(limit);
};

automationLogSchema.statics.getLogsByDateRange = async function(startDate, endDate) {
  return await this.find({
    start_time: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ start_time: -1 });
};

automationLogSchema.statics.getFailedJobs = async function(hours = 24) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return await this.find({
    status: 'failed',
    start_time: { $gte: startTime }
  }).sort({ start_time: -1 });
};

automationLogSchema.statics.getJobStatistics = async function(jobName, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const stats = await this.aggregate([
    {
      $match: {
        job_name: jobName,
        start_time: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avg_duration: { $avg: '$duration_ms' },
        total_records: { $sum: '$records_processed' }
      }
    }
  ]);
  
  const result = {
    job_name: jobName,
    period_days: days,
    total_executions: 0,
    completed: 0,
    failed: 0,
    avg_duration_ms: 0,
    total_records_processed: 0,
    success_rate: 0
  };
  
  stats.forEach(stat => {
    const count = parseInt(stat.count);
    result.total_executions += count;
    
    if (stat._id === 'completed') {
      result.completed = count;
      result.avg_duration_ms = parseFloat(stat.avg_duration) || 0;
      result.total_records_processed = parseInt(stat.total_records) || 0;
    } else if (stat._id === 'failed') {
      result.failed = count;
    }
  });
  
  if (result.total_executions > 0) {
    result.success_rate = (result.completed / result.total_executions) * 100;
  }
  
  return result;
};

automationLogSchema.statics.getSystemOverview = async function(hours = 24) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const overview = await this.aggregate([
    {
      $match: {
        start_time: { $gte: startTime }
      }
    },
    {
      $group: {
        _id: { job_type: '$job_type', status: '$status' },
        count: { $sum: 1 },
        avg_duration: { $avg: '$duration_ms' },
        total_records: { $sum: '$records_processed' }
      }
    }
  ]);
  
  const result = {};
  
  overview.forEach(item => {
    const jobType = item._id.job_type;
    const status = item._id.status;
    
    if (!result[jobType]) {
      result[jobType] = {
        total: 0,
        completed: 0,
        failed: 0,
        avg_duration_ms: 0,
        total_records: 0
      };
    }
    
    const count = parseInt(item.count);
    result[jobType].total += count;
    
    if (status === 'completed') {
      result[jobType].completed = count;
      result[jobType].avg_duration_ms = parseFloat(item.avg_duration) || 0;
      result[jobType].total_records = parseInt(item.total_records) || 0;
    } else if (status === 'failed') {
      result[jobType].failed = count;
    }
  });
  
  // Calcular tasas de éxito
  Object.keys(result).forEach(jobType => {
    const data = result[jobType];
    data.success_rate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
  });
  
  return {
    period_hours: hours,
    job_types: result,
    generated_at: new Date().toISOString()
  };
};

automationLogSchema.statics.getPerformanceMetrics = async function(days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const metrics = await this.aggregate([
    {
      $match: {
        start_time: { $gte: startDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$start_time' } },
          job_type: '$job_type'
        },
        executions: { $sum: 1 },
        avg_duration: { $avg: '$duration_ms' },
        total_records: { $sum: '$records_processed' }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
  
  return metrics.map(metric => ({
    date: metric._id.date,
    job_type: metric._id.job_type,
    executions: parseInt(metric.executions),
    avg_duration_ms: parseFloat(metric.avg_duration) || 0,
    total_records: parseInt(metric.total_records) || 0
  }));
};

automationLogSchema.statics.cleanupOldLogs = async function(days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate }
  });
  
  return result.deletedCount;
};

module.exports = AutomationLog;