const mongoose = require('mongoose');

// Modelo para tickets de soporte
const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'account', 'arbitrage', 'general'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'],
    default: 'open'
  },
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'admin', 'ai'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    },
    attachments: [{
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      url: String
    }]
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [String],
  metadata: {
    userAgent: String,
    ipAddress: String,
    platform: String,
    lastActivity: Date
  },
  aiAssistance: {
    enabled: {
      type: Boolean,
      default: true
    },
    confidence: Number,
    suggestedActions: [String],
    autoResolved: {
      type: Boolean,
      default: false
    }
  },
  satisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedAt: Date
  }
}, {
  timestamps: true
});

// Modelo para documentos informativos
const supportDocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['guide', 'faq', 'tutorial', 'policy', 'terms', 'arbitrage_guide', 'project'],
    required: true
  },
  type: {
    type: String,
    enum: ['pdf', 'doc', 'video', 'image', 'link', 'content', 'file'],
    required: true
  },
  fileInfo: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    downloadCount: {
      type: Number,
      default: 0
    }
  },
  content: {
    type: String // Para documentos de texto
  },
  tags: [String],
  language: {
    type: String,
    enum: ['es', 'en'],
    default: 'es'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  requiredRole: {
    type: String,
    enum: ['user', 'premium', 'admin'],
    default: 'user'
  },
  priority: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: String,
    default: '1.0'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Modelo para configuración de chat IA
const aiChatConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  apiProvider: {
    type: String,
    enum: ['openai', 'anthropic', 'google', 'custom'],
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  systemPrompt: {
    type: String,
    required: true
  },
  maxTokens: {
    type: Number,
    default: 1000
  },
  temperature: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 2
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rateLimits: {
    requestsPerMinute: {
      type: Number,
      default: 10
    },
    requestsPerHour: {
      type: Number,
      default: 100
    },
    requestsPerDay: {
      type: Number,
      default: 500
    }
  },
  categories: [{
    type: String,
    enum: ['technical', 'billing', 'account', 'arbitrage', 'general']
  }]
}, {
  timestamps: true
});

// Índices para optimización
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ ticketId: 1 });
supportTicketSchema.index({ category: 1, priority: 1 });
supportTicketSchema.index({ createdAt: -1 });

supportDocumentSchema.index({ category: 1, isActive: 1 });
supportDocumentSchema.index({ tags: 1 });
supportDocumentSchema.index({ language: 1, isPublic: 1 });
supportDocumentSchema.index({ priority: -1, createdAt: -1 });

aiChatConfigSchema.index({ isActive: 1, categories: 1 });

// Métodos del esquema
supportTicketSchema.methods.generateTicketId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `TK-${timestamp}-${random}`.toUpperCase();
};

supportTicketSchema.methods.addMessage = function(sender, content, attachments = []) {
  this.messages.push({
    sender,
    content,
    attachments,
    timestamp: new Date()
  });
  this.metadata.lastActivity = new Date();
  return this.save();
};

supportDocumentSchema.methods.incrementDownload = function() {
  this.fileInfo.downloadCount += 1;
  return this.save();
};

// Métodos estáticos
supportTicketSchema.statics.getTicketStats = async function(userId = null) {
  const match = userId ? { userId } : {};
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
};

supportDocumentSchema.statics.getPopularDocuments = async function(limit = 10) {
  return this.find({ isActive: true, isPublic: true })
    .sort({ 'fileInfo.downloadCount': -1, priority: -1 })
    .limit(limit)
    .populate('createdBy', 'fullName email');
};

aiChatConfigSchema.statics.getActiveConfig = async function(category = 'general') {
  return this.findOne({
    isActive: true,
    categories: { $in: [category] }
  }).sort({ updatedAt: -1 });
};

module.exports = {
  SupportTicket: mongoose.model('SupportTicket', supportTicketSchema),
  SupportDocument: mongoose.model('SupportDocument', supportDocumentSchema),
  AiChatConfig: mongoose.model('AiChatConfig', aiChatConfigSchema)
};