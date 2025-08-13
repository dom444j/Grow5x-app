// Exportar todos los servicios principales
const AIService = require('./AIService');
const AutomationService = require('./AutomationService');
const BenefitsProcessor = require('./BenefitsProcessor');
const CronJobService = require('./CronJobService');
const LicenseActivationService = require('./LicenseActivationService');
const NotificationService = require('./NotificationService');
const OptimizedCalculationService = require('./OptimizedCalculationService');
const ReportsGenerator = require('./ReportsGenerator');
const UserStatusService = require('./UserStatusService');
const bep20Service = require('./bep20.service');

module.exports = {
  // Servicios de IA y automatización
  AIService,
  AutomationService,
  CronJobService,
  
  // Servicios de procesamiento
  BenefitsProcessor,
  OptimizedCalculationService,
  
  // Servicios de activación y licencias
  LicenseActivationService,
  
  // Servicios de comunicación
  NotificationService,
  
  // Servicios de reportes
  ReportsGenerator,
  
  // Servicios de usuario
  UserStatusService,
  
  // Servicios de blockchain
  bep20Service,
  
  // Exportaciones específicas para compatibilidad
  automationService: AutomationService,
  benefitsProcessor: BenefitsProcessor,
  notificationService: NotificationService,
  reportsGenerator: ReportsGenerator,
  userStatusService: UserStatusService
};