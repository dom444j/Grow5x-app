const mongoose = require('mongoose');
const crypto = require('crypto');

const preregistrationSchema = new mongoose.Schema({
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  telegram: {
    type: String,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  estimatedAmount: {
    type: Number,
    required: true,
    min: 100
  },
  currency: {
    type: String,
    default: 'USDT',
    enum: ['USDT', 'USD', 'EUR']
  },
  status: { 
    type: String, 
    enum: ['pending', 'contacted', 'converted', 'rejected', 'expired'], 
    default: 'pending' 
  },
  source: {
    type: String,
    default: 'website'
  },
  referralCode: {
    type: String,
    trim: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptedTerms: { 
    type: Boolean, 
    required: true,
    validate: {
      validator: function(v) {
        return v === true;
      },
      message: 'Terms and conditions must be accepted'
    }
  },
  acceptedRisk: { 
    type: Boolean, 
    required: true,
    validate: {
      validator: function(v) {
        return v === true;
      },
      message: 'Risk disclosure must be accepted'
    }
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  language: {
    type: String,
    default: 'es',
    enum: ['es', 'en']
  },
  notes: {
    type: String,
    trim: true
  },
  contactedAt: {
    type: Date
  },
  convertedAt: {
    type: Date
  },
  convertedToUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: function() {
      if (this.estimatedAmount >= 10000) return 'urgent';
      if (this.estimatedAmount >= 5000) return 'high';
      if (this.estimatedAmount >= 1000) return 'medium';
      return 'low';
    }
  },
  metadata: {
    utm_source: String,
    utm_medium: String,
    utm_campaign: String,
    utm_content: String,
    utm_term: String
  }
}, {
  timestamps: true
});

// Indexes
preregistrationSchema.index({ email: 1 });
preregistrationSchema.index({ telegram: 1 });
preregistrationSchema.index({ status: 1 });
preregistrationSchema.index({ priority: 1 });
preregistrationSchema.index({ referralCode: 1 });
preregistrationSchema.index({ createdAt: 1 });
preregistrationSchema.index({ estimatedAmount: 1 });

// Compound indexes
preregistrationSchema.index({ status: 1, priority: 1 });
preregistrationSchema.index({ status: 1, createdAt: 1 });

// Validation: At least email or telegram is required
preregistrationSchema.pre('validate', function(next) {
  if (!this.email && !this.telegram) {
    this.invalidate('email', 'Either email or telegram is required');
    this.invalidate('telegram', 'Either email or telegram is required');
  }
  next();
});

// Method to mark as contacted
preregistrationSchema.methods.markAsContacted = function(notes) {
  this.status = 'contacted';
  this.contactedAt = new Date();
  if (notes) this.notes = notes;
  return this.save();
};

// Method to convert to user
preregistrationSchema.methods.convertToUser = function(userId) {
  this.status = 'converted';
  this.convertedAt = new Date();
  this.convertedToUser = userId;
  return this.save();
};

// Method to reject
preregistrationSchema.methods.reject = function(reason) {
  this.status = 'rejected';
  if (reason) this.notes = reason;
  return this.save();
};

// Static method to get statistics
preregistrationSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$estimatedAmount' },
        avgAmount: { $avg: '$estimatedAmount' }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$count' },
        totalEstimatedCapital: { $sum: '$totalAmount' },
        statuses: {
          $push: {
            status: '$_id',
            count: '$count',
            totalAmount: '$totalAmount',
            avgAmount: '$avgAmount'
          }
        }
      }
    }
  ]);
};

// Static method to get recent preregistrations
preregistrationSchema.statics.getRecent = function(limit = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('referredBy', 'email telegram referralCode')
    .select('-ipAddress -userAgent');
};

// Static method to get high priority preregistrations
preregistrationSchema.statics.getHighPriority = function() {
  return this.find({ 
    status: 'pending',
    priority: { $in: ['high', 'urgent'] }
  })
  .sort({ priority: -1, estimatedAmount: -1, createdAt: 1 })
  .populate('referredBy', 'email telegram referralCode');
};

module.exports = mongoose.model('Preregistration', preregistrationSchema);