const axios = require('axios');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    this.apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 500;
    this.temperature = parseFloat(process.env.AI_TEMPERATURE) || 0.7;
    
    // Base de conocimientos para respuestas automáticas
    this.knowledgeBase = {
      'password_reset': {
        keywords: ['contraseña', 'password', 'reset', 'olvidé', 'cambiar'],
        response: 'Para restablecer tu contraseña, ve a la página de inicio de sesión y haz clic en "¿Olvidaste tu contraseña?". Te enviaremos un enlace de restablecimiento a tu correo electrónico registrado.',
        confidence: 0.9
      },
      'referral_program': {
        keywords: ['referido', 'referral', 'comisión', 'invitar', 'amigos'],
        response: 'Nuestro programa de referidos te permite ganar comisiones invitando amigos. Encuentra tu enlace único en el panel de referidos y compártelo. Ganarás comisiones por cada inversión que realicen tus referidos.',
        confidence: 0.85
      },
      'account_verification': {
        keywords: ['verificar', 'verificación', 'documento', 'identidad', 'kyc'],
        response: 'Para verificar tu cuenta, ve a la sección de perfil y sube los documentos requeridos: documento de identidad válido y comprobante de domicilio. El proceso de verificación toma entre 24-48 horas.',
        confidence: 0.9
      },
      'withdrawal': {
        keywords: ['retiro', 'retirar', 'withdrawal', 'sacar', 'dinero'],
        response: 'Para realizar un retiro, ve a la sección de billetera, selecciona "Retirar", elige el método de pago y el monto. Los retiros se procesan en 1-3 días hábiles dependiendo del método seleccionado.',
        confidence: 0.85
      },
      'investment_plans': {
        keywords: ['plan', 'inversión', 'investment', 'paquete', 'rendimiento'],
        response: 'Ofrecemos varios planes de inversión con diferentes niveles de rendimiento y duración. Puedes ver todos los planes disponibles en la sección de inversiones de tu panel de usuario.',
        confidence: 0.8
      },
      'payment_methods': {
        keywords: ['pago', 'payment', 'método', 'depositar', 'tarjeta'],
        response: 'Aceptamos múltiples métodos de pago incluyendo tarjetas de crédito/débito, transferencias bancarias y criptomonedas. Puedes ver todos los métodos disponibles en la sección de depósitos.',
        confidence: 0.85
      },
      'account_security': {
        keywords: ['seguridad', 'security', '2fa', 'autenticación', 'hackeo'],
        response: 'Para mayor seguridad, recomendamos activar la autenticación de dos factores (2FA) en tu cuenta. También usa contraseñas fuertes y nunca compartas tus credenciales.',
        confidence: 0.9
      },
      'commission_calculation': {
        keywords: ['comisión', 'commission', 'cálculo', 'ganancia', 'porcentaje'],
        response: 'Las comisiones se calculan basándose en el plan de inversión de tus referidos y tu nivel en el programa. Puedes ver el detalle de tus comisiones en el panel de referidos.',
        confidence: 0.8
      }
    };
  }

  /**
   * Analiza un ticket y genera una respuesta automática
   */
  async analyzeTicket(ticket) {
    try {
      // Primero intentar con base de conocimientos local
      const localResponse = this.getLocalResponse(ticket);
      if (localResponse && localResponse.confidence > 0.7) {
        return {
          response: localResponse.response,
          confidence: localResponse.confidence,
          source: 'knowledge_base',
          requiresHumanReview: localResponse.confidence < 0.8
        };
      }

      // Si no hay respuesta local o la confianza es baja, usar IA externa
      if (this.apiKey) {
        const aiResponse = await this.getAIResponse(ticket);
        return {
          response: aiResponse.response,
          confidence: aiResponse.confidence,
          source: 'ai_api',
          requiresHumanReview: aiResponse.confidence < 0.8
        };
      }

      // Respuesta de fallback
      return {
        response: 'Gracias por contactarnos. Hemos recibido tu consulta y un miembro de nuestro equipo de soporte te responderá pronto.',
        confidence: 0.5,
        source: 'fallback',
        requiresHumanReview: true
      };

    } catch (error) {
      logger.error('Error analyzing ticket with AI:', error);
      return {
        response: 'Hemos recibido tu consulta. Un agente te contactará pronto para ayudarte.',
        confidence: 0.3,
        source: 'error_fallback',
        requiresHumanReview: true
      };
    }
  }

  /**
   * Busca respuesta en la base de conocimientos local
   */
  getLocalResponse(ticket) {
    const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
    
    let bestMatch = null;
    let highestScore = 0;

    for (const [category, data] of Object.entries(this.knowledgeBase)) {
      const score = this.calculateMatchScore(text, data.keywords);
      if (score > highestScore && score > 0.3) {
        highestScore = score;
        bestMatch = {
          category,
          response: data.response,
          confidence: Math.min(data.confidence * score, 0.95)
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calcula el score de coincidencia con palabras clave
   */
  calculateMatchScore(text, keywords) {
    let matches = 0;
    let totalKeywords = keywords.length;

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matches++;
      }
    }

    return matches / totalKeywords;
  }

  /**
   * Obtiene respuesta de API de IA externa
   */
  async getAIResponse(ticket) {
    try {
      const prompt = this.buildPrompt(ticket);
      
      const response = await axios.post(this.apiUrl, {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente de soporte técnico para Grow5X, una plataforma de inversiones. Responde de manera profesional, clara y útil. Mantén las respuestas concisas pero informativas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const aiResponse = response.data.choices[0].message.content;
      const confidence = this.calculateAIConfidence(aiResponse, ticket);

      return {
        response: aiResponse,
        confidence: confidence
      };

    } catch (error) {
      logger.error('Error calling AI API:', error);
      throw error;
    }
  }

  /**
   * Construye el prompt para la IA
   */
  buildPrompt(ticket) {
    return `
Usuario: ${ticket.userName}
Asunto: ${ticket.subject}
Categoría: ${ticket.category}
Prioridad: ${ticket.priority}
Descripción: ${ticket.description}

Por favor, proporciona una respuesta útil y profesional para este ticket de soporte. La respuesta debe ser específica al problema planteado y incluir pasos claros si es necesario.
`;
  }

  /**
   * Calcula la confianza de la respuesta de IA
   */
  calculateAIConfidence(response, ticket) {
    let confidence = 0.7; // Base confidence

    // Aumentar confianza si la respuesta es detallada
    if (response.length > 100) confidence += 0.1;
    if (response.length > 200) confidence += 0.1;

    // Reducir confianza si la respuesta es muy genérica
    const genericPhrases = ['contacta', 'comunícate', 'no puedo', 'no sé'];
    for (const phrase of genericPhrases) {
      if (response.toLowerCase().includes(phrase)) {
        confidence -= 0.2;
        break;
      }
    }

    // Aumentar confianza si menciona términos específicos del ticket
    const ticketWords = ticket.subject.toLowerCase().split(' ');
    for (const word of ticketWords) {
      if (word.length > 3 && response.toLowerCase().includes(word)) {
        confidence += 0.05;
      }
    }

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Categoriza automáticamente un ticket
   */
  categorizeTicket(ticket) {
    const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
    
    const categories = {
      'technical': ['error', 'bug', 'problema técnico', 'no funciona', 'fallo'],
      'financial': ['pago', 'retiro', 'depósito', 'comisión', 'dinero', 'transferencia'],
      'account': ['cuenta', 'perfil', 'verificación', 'documento', 'acceso'],
      'referrals': ['referido', 'invitar', 'enlace', 'comisión de referido'],
      'payments': ['método de pago', 'tarjeta', 'banco', 'criptomoneda']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return category;
        }
      }
    }

    return 'general';
  }

  /**
   * Determina la prioridad automática de un ticket
   */
  determinePriority(ticket) {
    const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
    
    const urgentKeywords = ['urgente', 'emergencia', 'crítico', 'no puedo acceder', 'hackeo'];
    const highKeywords = ['problema', 'error', 'fallo', 'no funciona'];
    
    for (const keyword of urgentKeywords) {
      if (text.includes(keyword)) {
        return 'urgent';
      }
    }
    
    for (const keyword of highKeywords) {
      if (text.includes(keyword)) {
        return 'high';
      }
    }
    
    return 'normal';
  }

  /**
   * Genera respuestas sugeridas para administradores
   */
  async generateSuggestedResponses(ticket, responses = []) {
    try {
      const context = this.buildContextFromResponses(ticket, responses);
      
      // Generar 3 respuestas sugeridas
      const suggestions = [];
      
      for (let i = 0; i < 3; i++) {
        const prompt = `
Basándote en este ticket y las respuestas anteriores, genera una respuesta profesional y útil:

${context}

Respuesta sugerida ${i + 1}:`;
        
        if (this.apiKey) {
          try {
            const response = await this.getAIResponse({ ...ticket, description: prompt });
            suggestions.push({
              text: response.response,
              confidence: response.confidence,
              type: i === 0 ? 'detailed' : i === 1 ? 'concise' : 'alternative'
            });
          } catch (error) {
            // Fallback para esta sugerencia específica
            suggestions.push({
              text: 'Gracias por tu consulta. Estamos revisando tu caso y te responderemos pronto.',
              confidence: 0.5,
              type: 'fallback'
            });
          }
        }
      }
      
      return suggestions;
      
    } catch (error) {
      logger.error('Error generating suggested responses:', error);
      return [];
    }
  }

  /**
   * Construye contexto a partir de respuestas anteriores
   */
  buildContextFromResponses(ticket, responses) {
    let context = `Ticket: ${ticket.subject}\nDescripción: ${ticket.description}\n\n`;
    
    if (responses.length > 0) {
      context += 'Conversación anterior:\n';
      responses.forEach((response, index) => {
        context += `${response.authorType === 'user' ? 'Usuario' : 'Soporte'}: ${response.message}\n`;
      });
    }
    
    return context;
  }
}

module.exports = new AIService();