const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Configuración de colores y estilos
const colors = {
  primary: '#1E40AF',     // Azul principal
  secondary: '#3B82F6',   // Azul secundario
  accent: '#10B981',      // Verde para destacar
  warning: '#F59E0B',     // Amarillo/naranja para advertencias
  danger: '#EF4444',      // Rojo para riesgos
  text: '#1F2937',        // Gris oscuro para texto
  lightText: '#6B7280',   // Gris claro para texto secundario
  background: '#F9FAFB'   // Fondo claro
};

class PresentationPDFGenerator {
  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      info: {
        Title: 'Presentación del Proyecto GrowX5',
        Author: 'GrowX5',
        Subject: 'Documento de Presentación para Usuarios y Difusión',
        Keywords: 'GrowX5, Criptomonedas, Arbitraje, IA, Inversión'
      }
    });
    
    this.currentY = 50;
    this.pageWidth = 595.28; // A4 width in points
    this.pageHeight = 841.89; // A4 height in points
    this.margin = 50;
    this.contentWidth = this.pageWidth - (this.margin * 2);
  }

  // Método para agregar una nueva página
  addPage() {
    this.doc.addPage();
    this.currentY = 50;
    this.addHeader();
  }

  // Verificar si necesitamos una nueva página
  checkPageBreak(requiredHeight = 100) {
    if (this.currentY + requiredHeight > this.pageHeight - this.margin) {
      this.addPage();
    }
  }

  // Agregar encabezado en cada página
  addHeader() {
    this.doc
      .fontSize(10)
      .fillColor(colors.lightText)
      .text('GrowX5 - Herramienta Tecnológica', this.margin, 20, { align: 'right' });
    
    // Línea decorativa
    this.doc
      .strokeColor(colors.primary)
      .lineWidth(2)
      .moveTo(this.margin, 35)
      .lineTo(this.pageWidth - this.margin, 35)
      .stroke();
  }

  // Agregar pie de página
  addFooter(pageNumber) {
    const footerY = this.pageHeight - 30;
    
    // Línea decorativa
    this.doc
      .strokeColor(colors.primary)
      .lineWidth(1)
      .moveTo(this.margin, footerY - 10)
      .lineTo(this.pageWidth - this.margin, footerY - 10)
      .stroke();
    
    // Número de página
    this.doc
      .fontSize(10)
      .fillColor(colors.lightText)
      .text(`Página ${pageNumber}`, this.margin, footerY, { align: 'center' });
    
    // Copyright
    this.doc
      .text('© 2024 GrowX5. Herramienta Tecnológica - Use bajo su propia responsabilidad.', 
            this.margin, footerY, { align: 'right' });
  }

  // Agregar título principal
  addMainTitle(title, subtitle = null) {
    this.checkPageBreak(120);
    
    // Fondo decorativo para el título
    this.doc
      .rect(this.margin - 10, this.currentY - 10, this.contentWidth + 20, 80)
      .fillAndStroke(colors.primary, colors.primary);
    
    // Título principal
    this.doc
      .fontSize(28)
      .fillColor('white')
      .font('Helvetica-Bold')
      .text(title, this.margin, this.currentY + 10, {
        width: this.contentWidth,
        align: 'center'
      });
    
    this.currentY += 45;
    
    if (subtitle) {
      this.doc
        .fontSize(14)
        .fillColor('white')
        .font('Helvetica')
        .text(subtitle, this.margin, this.currentY, {
          width: this.contentWidth,
          align: 'center'
        });
      this.currentY += 25;
    }
    
    this.currentY += 30;
  }

  // Agregar título de sección
  addSectionTitle(title, icon = null) {
    this.checkPageBreak(60);
    
    // Fondo de sección
    this.doc
      .rect(this.margin - 5, this.currentY - 5, this.contentWidth + 10, 35)
      .fillAndStroke(colors.background, colors.secondary);
    
    // Título de sección
    this.doc
      .fontSize(18)
      .fillColor(colors.primary)
      .font('Helvetica-Bold')
      .text((icon ? icon + ' ' : '') + title, this.margin + 10, this.currentY + 5);
    
    this.currentY += 45;
  }

  // Agregar párrafo
  addParagraph(text, options = {}) {
    const fontSize = options.fontSize || 11;
    const color = options.color || colors.text;
    const font = options.bold ? 'Helvetica-Bold' : 'Helvetica';
    const indent = options.indent || 0;
    
    this.checkPageBreak(50);
    
    this.doc
      .fontSize(fontSize)
      .fillColor(color)
      .font(font)
      .text(text, this.margin + indent, this.currentY, {
        width: this.contentWidth - indent,
        align: options.align || 'left',
        lineGap: 3
      });
    
    this.currentY = this.doc.y + 15;
  }

  // Agregar lista con viñetas
  addBulletList(items, options = {}) {
    const indent = options.indent || 20;
    
    items.forEach(item => {
      this.checkPageBreak(30);
      
      // Viñeta
      this.doc
        .fontSize(12)
        .fillColor(colors.primary)
        .text('•', this.margin + indent - 15, this.currentY);
      
      // Texto del item
      this.doc
        .fontSize(11)
        .fillColor(colors.text)
        .font('Helvetica')
        .text(item, this.margin + indent, this.currentY, {
          width: this.contentWidth - indent,
          lineGap: 2
        });
      
      this.currentY = this.doc.y + 8;
    });
    
    this.currentY += 10;
  }

  // Agregar tabla
  addTable(headers, rows, options = {}) {
    const tableWidth = this.contentWidth;
    const colWidth = tableWidth / headers.length;
    const rowHeight = options.rowHeight || 25;
    
    this.checkPageBreak(rowHeight * (rows.length + 2));
    
    const startY = this.currentY;
    
    // Encabezados
    this.doc
      .rect(this.margin, startY, tableWidth, rowHeight)
      .fillAndStroke(colors.primary, colors.primary);
    
    headers.forEach((header, i) => {
      this.doc
        .fontSize(10)
        .fillColor('white')
        .font('Helvetica-Bold')
        .text(header, this.margin + (i * colWidth) + 5, startY + 8, {
          width: colWidth - 10,
          align: 'center'
        });
    });
    
    // Filas
    rows.forEach((row, rowIndex) => {
      const y = startY + rowHeight * (rowIndex + 1);
      
      // Fondo alternado
      if (rowIndex % 2 === 0) {
        this.doc
          .rect(this.margin, y, tableWidth, rowHeight)
          .fillAndStroke(colors.background, colors.lightText);
      } else {
        this.doc
          .rect(this.margin, y, tableWidth, rowHeight)
          .stroke(colors.lightText);
      }
      
      row.forEach((cell, colIndex) => {
        this.doc
          .fontSize(9)
          .fillColor(colors.text)
          .font('Helvetica')
          .text(cell, this.margin + (colIndex * colWidth) + 5, y + 8, {
            width: colWidth - 10,
            align: 'center'
          });
      });
    });
    
    this.currentY = startY + rowHeight * (rows.length + 1) + 20;
  }

  // Agregar caja de advertencia
  addWarningBox(title, content) {
    this.checkPageBreak(80);
    
    const boxHeight = 60;
    
    // Fondo de advertencia
    this.doc
      .rect(this.margin, this.currentY, this.contentWidth, boxHeight)
      .fillAndStroke('#FEF3C7', colors.warning);
    
    // Icono de advertencia
    this.doc
      .fontSize(16)
      .fillColor(colors.warning)
      .text('⚠️', this.margin + 10, this.currentY + 10);
    
    // Título de advertencia
    this.doc
      .fontSize(12)
      .fillColor(colors.warning)
      .font('Helvetica-Bold')
      .text(title, this.margin + 35, this.currentY + 10);
    
    // Contenido
    this.doc
      .fontSize(10)
      .fillColor(colors.text)
      .font('Helvetica')
      .text(content, this.margin + 10, this.currentY + 30, {
        width: this.contentWidth - 20,
        lineGap: 2
      });
    
    this.currentY += boxHeight + 20;
  }

  // Agregar caja de información
  addInfoBox(title, content, color = colors.accent) {
    this.checkPageBreak(80);
    
    const boxHeight = 60;
    
    // Fondo de información
    this.doc
      .rect(this.margin, this.currentY, this.contentWidth, boxHeight)
      .fillAndStroke('#ECFDF5', color);
    
    // Título
    this.doc
      .fontSize(12)
      .fillColor(color)
      .font('Helvetica-Bold')
      .text(title, this.margin + 10, this.currentY + 10);
    
    // Contenido
    this.doc
      .fontSize(10)
      .fillColor(colors.text)
      .font('Helvetica')
      .text(content, this.margin + 10, this.currentY + 30, {
        width: this.contentWidth - 20,
        lineGap: 2
      });
    
    this.currentY += boxHeight + 20;
  }

  // Generar el PDF completo
  async generatePDF() {
    let pageNumber = 1;
    
    // Página de portada
    this.addMainTitle('🚀 Presentación del Proyecto GrowX5', 
                     'Herramienta Tecnológica Avanzada para Arbitraje de Criptomonedas');
    
    this.addParagraph('Fecha de creación: Diciembre 2024', { align: 'center', color: colors.lightText });
    this.addParagraph('Versión: 1.0', { align: 'center', color: colors.lightText });
    this.addParagraph('Tipo: Documento de Presentación para Usuarios y Difusión', { align: 'center', color: colors.lightText });
    
    this.currentY += 50;
    
    this.addWarningBox('ADVERTENCIA IMPORTANTE', 
      'La participación en GrowX5 implica riesgos significativos. No invierta fondos que no esté dispuesto a perder. No se garantiza rentabilidad ni retorno del capital.');
    
    this.addFooter(pageNumber++);
    
    // Página 2: ¿Qué es GrowX5?
    this.addPage();
    this.addSectionTitle('¿Qué es GrowX5?', '🎯');
    
    this.addParagraph('GrowX5 es una herramienta tecnológica avanzada que utiliza inteligencia artificial para la gestión automatizada de estrategias de arbitraje en mercados de criptomonedas. Es únicamente una herramienta tecnológica, y el usuario asume plena responsabilidad por su uso y los resultados obtenidos.');
    
    this.addSectionTitle('Características Principales', '✨');
    this.addBulletList([
      'Herramienta Autónoma: Sistema que opera con agentes de IA',
      'Inteligencia Artificial: Algoritmos para estrategias de arbitraje',
      'Objetivo de Retornos: Aspira a lograr hasta 500% de retorno total',
      'Seguridad Avanzada: Protocolos de seguridad implementados',
      'Transparencia: Seguimiento de operaciones disponible'
    ]);
    
    this.addFooter(pageNumber++);
    
    // Página 3: Sistema de Beneficios
    this.addPage();
    this.addSectionTitle('Sistema de Beneficios', '💰');
    
    this.addSectionTitle('Objetivo de Retornos', '🔥');
    this.addBulletList([
      '12.5% diario sobre el monto de la licencia durante días activos',
      'Objetivo total: 500% (100% cashback + 400% beneficios potenciales)',
      'Duración: 5 ciclos de 8 días (45 días totales)',
      'Estructura: 8 días activos + 1 día de pausa por ciclo'
    ]);
    
    this.addSectionTitle('Estructura de Ciclos', '📊');
    this.addParagraph('Funcionamiento por ciclos:', { bold: true });
    this.addBulletList([
      'Días 1-8: Primer ciclo - Cashback del 100% (12.5% diario)',
      'Día 9: Día de pausa/ajuste',
      'Días 10-17: Segundo ciclo de beneficios',
      'Ciclos 3-5: Continúan hasta completar 45 días'
    ]);
    
    this.addParagraph('Importante: Los resultados dependen de factores externos como volatilidad del mercado, fallos tecnológicos, o cambios regulatorios.', 
                     { color: colors.warning, bold: true });
    
    this.addFooter(pageNumber++);
    
    // Página 4: Calculadora de Retornos
    this.addPage();
    this.addSectionTitle('Calculadora de Retornos', '📈');
    
    const tableHeaders = ['Inversión', 'Ganancia Total', 'Total Final', 'ROI'];
    const tableRows = [
      ['$50 USDT', '$200 USDT', '$250 USDT', '400%'],
      ['$100 USDT', '$400 USDT', '$500 USDT', '400%'],
      ['$250 USDT', '$1,000 USDT', '$1,250 USDT', '400%'],
      ['$500 USDT', '$2,000 USDT', '$2,500 USDT', '400%'],
      ['$1,000 USDT', '$4,000 USDT', '$5,000 USDT', '400%']
    ];
    
    this.addTable(tableHeaders, tableRows);
    
    this.addSectionTitle('Ejemplo Ilustrativo', '🎯');
    this.addParagraph('Licencia de $1,000 USDT:', { bold: true });
    this.addBulletList([
      'Primer ciclo: Objetivo de cashback del 100% ($1,000)',
      'Ciclos 2-5: Objetivo de $1,000 por ciclo en beneficios',
      'Objetivo total: $5,000 USDT (sujeto a condiciones del mercado)'
    ]);
    
    this.addFooter(pageNumber++);
    
    // Página 5: Paquetes de Licencias
    this.addPage();
    this.addSectionTitle('Paquetes de Licencias Disponibles', '🎁');
    
    const packages = [
      {
        name: '💎 Licencia Starter - $50 USDT',
        features: [
          'Duración: 5 ciclos (45 días)',
          'Objetivo Diario: $6.25 USDT (12.5%)',
          'Objetivo Total: $250 USDT (500%)',
          'Comisión Referidos: 10%',
          'Características: Acceso básico, soporte por email'
        ]
      },
      {
        name: '🚀 Licencia Basic - $100 USDT',
        features: [
          'Duración: 5 ciclos (45 días)',
          'Objetivo Diario: $12.50 USDT (12.5%)',
          'Objetivo Total: $500 USDT (500%)',
          'Comisión Referidos: 15%',
          'Características: Acceso completo, soporte prioritario'
        ]
      },
      {
        name: '⭐ Licencia Standard - $250 USDT (Más Popular)',
        features: [
          'Duración: 5 ciclos (45 días)',
          'Objetivo Diario: $31.25 USDT (12.5%)',
          'Objetivo Total: $1,250 USDT (500%)',
          'Comisión Referidos: 20%',
          'Características: Acceso VIP, soporte 24/7, webinars exclusivos'
        ]
      }
    ];
    
    packages.forEach(pkg => {
      this.addSectionTitle(pkg.name);
      this.addBulletList(pkg.features);
    });
    
    this.addFooter(pageNumber++);
    
    // Página 6: Más Paquetes Premium
    this.addPage();
    
    const premiumPackages = [
      {
        name: '👑 Licencia Premium - $500 USDT',
        features: [
          'Duración: 5 ciclos (45 días)',
          'Objetivo Diario: $62.50 USDT (12.5%)',
          'Objetivo Total: $2,500 USDT (500%)',
          'Comisión Referidos: 25%',
          'Características: Acceso Premium, soporte dedicado, mentorías'
        ]
      },
      {
        name: '💰 Licencia Gold - $1,000 USDT',
        features: [
          'Duración: 5 ciclos (45 días)',
          'Objetivo Diario: $125 USDT (12.5%)',
          'Objetivo Total: $5,000 USDT (500%)',
          'Comisión Referidos: 30%',
          'Características: Acceso Gold exclusivo, manager personal'
        ]
      },
      {
        name: '🏆 Licencia Platinum - $2,500 USDT',
        features: [
          'Duración: 5 ciclos (45 días)',
          'Objetivo Diario: $312.50 USDT (12.5%)',
          'Objetivo Total: $12,500 USDT (500%)',
          'Comisión Referidos: 35%',
          'Características: Acceso Platinum ilimitado, equipo dedicado'
        ]
      },
      {
        name: '💎 Licencia Diamond - $5,000 USDT',
        features: [
          'Duración: 5 ciclos (45 días)',
          'Objetivo Diario: $625 USDT (12.5%)',
          'Objetivo Total: $25,000 USDT (500%)',
          'Comisión Referidos: 40%',
          'Características: Acceso Diamond completo, socio estratégico'
        ]
      }
    ];
    
    premiumPackages.forEach(pkg => {
      this.addSectionTitle(pkg.name);
      this.addBulletList(pkg.features);
    });
    
    this.addFooter(pageNumber++);
    
    // Página 7: Sistema de Referidos
    this.addPage();
    this.addSectionTitle('Sistema de Referidos', '🤝');
    
    this.addSectionTitle('Comisiones del Sistema', '💸');
    this.addBulletList([
      '10% de comisión directa al completar el cashback del referido (8 días)',
      '5% de bono especial para códigos líder/padre (día 17, pago único por usuario)',
      'Pagos automáticos con opción de aprobación administrativa',
      'Seguimiento en tiempo real de tus comisiones'
    ]);
    
    this.addSectionTitle('Ejemplo de Comisiones', '🏆');
    this.addParagraph('Si refiere 1 persona con Licencia Standard ($250):', { bold: true });
    this.addBulletList([
      'Comisión Directa: 10% del cashback completado = $25 USDT (pago único)',
      'Bono Especial: 5% del monto total de licencias (día 17, pago único por usuario)',
      'Reactivación: Se reactiva con nuevas compras del mismo usuario'
    ]);
    
    this.addSectionTitle('Cómo Funciona', '🔗');
    this.addBulletList([
      'Comparte tu código de referido único',
      'Tu referido se registra usando tu enlace',
      'Compra su licencia y comienza a generar beneficios',
      'Recibes tu comisión automáticamente al completar su primer ciclo',
      'Ganas en cada renovación que haga tu referido'
    ]);
    
    this.addFooter(pageNumber++);
    
    // Página 8: Herramientas y Características
    this.addPage();
    this.addSectionTitle('Herramientas y Características Exclusivas', '🛠️');
    
    this.addSectionTitle('Sistema de Soporte con IA', '🤖');
    this.addBulletList([
      'Chat en vivo 24/7 con inteligencia artificial',
      'Gestión de tickets para soporte técnico',
      'Respuestas instantáneas a consultas frecuentes',
      'Escalamiento automático a soporte humano cuando sea necesario'
    ]);
    
    this.addSectionTitle('Panel de Control Avanzado', '📊');
    this.addBulletList([
      'Dashboard personalizado con métricas en tiempo real',
      'Historial completo de transacciones y beneficios',
      'Calculadora de retornos integrada',
      'Gestión de referidos con estadísticas detalladas'
    ]);
    
    this.addSectionTitle('Sistema de Pagos Seguro', '💳');
    this.addBulletList([
      'Múltiples criptomonedas soportadas',
      'Retiros automáticos sin períodos de bloqueo',
      'Verificación de wallets para mayor seguridad',
      'Historial transparente de todas las operaciones'
    ]);
    
    this.addSectionTitle('Plataforma Multiidioma', '🌐');
    this.addBulletList([
      'Español e Inglés completamente soportados',
      'Interfaz adaptativa según preferencias del usuario',
      'Documentación completa en ambos idiomas'
    ]);
    
    this.addFooter(pageNumber++);
    
    // Página 9: Seguridad y Privacidad
    this.addPage();
    this.addSectionTitle('Seguridad y Privacidad', '🔒');
    
    this.addSectionTitle('Protocolos de Seguridad Implementados', '🛡️');
    this.addBulletList([
      'Medidas de seguridad avanzadas según estándares de la industria',
      'Auditorías de seguridad cuando sea posible',
      'Protocolos anti-fraude básicos implementados',
      'Autenticación de dos factores (2FA) disponible',
      'Monitoreo de actividades según recursos disponibles'
    ]);
    
    this.addSectionTitle('Políticas de Privacidad', '🕶️');
    this.addBulletList([
      'Cumplimiento KYC/AML según normativas aplicables',
      'Datos necesarios para operación y cumplimiento legal',
      'Protección de fondos sujeta a condiciones del mercado',
      'Gestión de inversiones como herramienta tecnológica',
      'Procesos de retiro sujetos a verificaciones de seguridad'
    ]);
    
    this.addWarningBox('Importante', 
      'No se puede garantizar protección absoluta contra ciberataques o fallos tecnológicos.');
    
    this.addFooter(pageNumber++);
    
    // Página 10: Ventajas Competitivas
    this.addPage();
    this.addSectionTitle('Ventajas Competitivas', '🎯');
    
    this.addSectionTitle('Automatización Completa', '⚡');
    this.addBulletList([
      'Sistema automatizado que gestiona tu capital sin intervención manual',
      'Ciclos optimizados con IA avanzada',
      'Estrategias automatizadas basadas en algoritmos propietarios',
      'Resultados visibles desde el primer día'
    ]);
    
    this.addSectionTitle('Rendimientos Superiores', '📈');
    this.addBulletList([
      '400% de ganancia neta garantizada en 45 días',
      '12.5% diario durante días activos',
      'Sin riesgo de pérdida del capital inicial',
      'Pagos puntuales y automáticos'
    ]);
    
    this.addSectionTitle('Experiencia de Usuario Excepcional', '🌟');
    this.addBulletList([
      'Interfaz intuitiva y fácil de usar',
      'Guías paso a paso para nuevos usuarios',
      'Recursos educativos incluidos',
      'Soporte técnico disponible 24/7'
    ]);
    
    this.addFooter(pageNumber++);
    
    // Página 11: Términos y Condiciones
    this.addPage();
    this.addSectionTitle('Términos y Condiciones Importantes', '⚠️');
    
    this.addWarningBox('ADVERTENCIAS CRÍTICAS', 
      'GrowX5 es únicamente una herramienta tecnológica que utiliza inteligencia artificial para estrategias de arbitraje. El usuario asume plena responsabilidad por su uso y resultados.');
    
    this.addSectionTitle('Riesgos Importantes', '📋');
    this.addBulletList([
      'Alto Riesgo: Las operaciones con criptomonedas son de alto riesgo',
      'Sin Garantías: No se garantiza rentabilidad ni retorno del capital',
      'Pérdidas Posibles: Puede resultar en pérdida parcial o total del capital',
      'Factores Externos: Resultados dependen de volatilidad del mercado, fallos tecnológicos, cambios regulatorios'
    ]);
    
    this.addSectionTitle('Objetivo del Sistema', '🎯');
    this.addBulletList([
      'Meta: Lograr hasta 500% de retorno total (100% cashback + 400% beneficios)',
      'Duración: 5 ciclos de 8 días (45 días totales)',
      'Estructura: 12.5% diario durante días activos',
      'Importante: Actuando de buena fe, sin garantizar resultados'
    ]);
    
    this.addSectionTitle('Condiciones de Uso', '📜');
    this.addBulletList([
      'Edad Mínima: 18 años o más',
      'Capital de Riesgo: Solo invertir fondos que esté dispuesto a perder',
      'Cumplimiento Legal: Verificar legalidad según jurisdicción local',
      'KYC/AML: Procesos de verificación requeridos',
      'Modificaciones: Condiciones pueden cambiar según mercado y regulaciones'
    ]);
    
    this.addFooter(pageNumber++);
    
    // Página 12: Cómo Empezar
    this.addPage();
    this.addSectionTitle('Cómo Empezar', '🚀');
    
    this.addSectionTitle('Proceso de Registro', '📝');
    this.addBulletList([
      'Registro (Verificación requerida): Completa el formulario de registro, verifica tu email, completa proceso KYC si es requerido',
      'Selección de Licencia: Revisa todos los paquetes disponibles, evalúa los riesgos asociados, selecciona según tu tolerancia al riesgo',
      'Pago Seguro: Realiza el pago en criptomonedas aceptadas, espera confirmación de la red, activación sujeta a verificaciones',
      'Uso de la Herramienta: Acceso a la herramienta tecnológica, monitoreo de operaciones disponible, resultados sujetos a condiciones del mercado'
    ]);
    
    this.addSectionTitle('Métodos de Pago Aceptados', '💳');
    this.addBulletList([
      'USDT (TRC-20) - Tether en red Tron',
      'USDT (BEP-20) - Tether en Binance Smart Chain',
      'Bitcoin (BTC) - Red Bitcoin',
      'Otras criptomonedas según disponibilidad'
    ]);
    
    this.addSectionTitle('Recomendaciones para Nuevos Usuarios', '💡');
    this.addBulletList([
      'Evalúa tu tolerancia al riesgo antes de seleccionar una licencia',
      'Lee completamente todos los términos y condiciones',
      'Invierte solo capital de riesgo que puedas permitirte perder',
      'Utiliza el chat de soporte para resolver cualquier duda',
      'Revisa tu dashboard para seguimiento de operaciones'
    ]);
    
    this.addFooter(pageNumber++);
    
    // Página 13: Soporte y Contacto
    this.addPage();
    this.addSectionTitle('Soporte y Contacto', '📞');
    
    this.addSectionTitle('Canales de Soporte Oficiales', '🎧');
    this.addBulletList([
      'Email Oficial: support@grow5x.app',
      'Chat en Plataforma: Disponible según horarios operativos',
      'Centro de Ayuda: Documentación y preguntas frecuentes'
    ]);
    
    this.addWarningBox('Importante', 
      'GrowX5 NO atiende solicitudes ni reclamaciones enviadas a través de canales no oficiales, incluyendo redes sociales o terceros.');
    
    this.addSectionTitle('Tiempos de Respuesta', '⏰');
    this.addBulletList([
      'Email: Respuesta en plazo razonable según complejidad',
      'Chat: Sujeto a disponibilidad de soporte',
      'Consultas: Se proporcionan respuestas según recursos disponibles'
    ]);
    
    this.addSectionTitle('Resolución de Disputas', '⚖️');
    this.addBulletList([
      'Arbitraje Vinculante: Controversias resueltas mediante arbitraje',
      'Jurisdicción: Según la jurisdicción donde opera GrowX5',
      'Proceso Previo: Agotar proceso de arbitraje antes de acciones legales',
      'Cumplimiento: Sujeto a las leyes aplicables'
    ]);
    
    this.addSectionTitle('Enlaces Importantes', '🔗');
    this.addBulletList([
      '🌐 Plataforma: https://growx5.app',
      '📱 Telegram: Canal Oficial de GrowX5',
      '📧 Contacto: support@growx5.app',
      '📚 Documentación: Disponible en la plataforma'
    ]);
    
    this.addFooter(pageNumber++);
    
    // Página final
    this.addPage();
    this.currentY = this.pageHeight / 2 - 100;
    
    this.addInfoBox('Nota Final', 
      'Este documento contiene información general sobre la herramienta GrowX5. Para términos y condiciones completos, consulte la documentación legal oficial. La participación implica riesgos significativos.');
    
    this.doc
      .fontSize(16)
      .fillColor(colors.primary)
      .font('Helvetica-Bold')
      .text('© 2024 GrowX5', this.margin, this.currentY + 50, {
        width: this.contentWidth,
        align: 'center'
      });
    
    this.doc
      .fontSize(14)
      .fillColor(colors.text)
      .font('Helvetica')
      .text('Herramienta Tecnológica - Use bajo su propia responsabilidad.', this.margin, this.currentY + 80, {
        width: this.contentWidth,
        align: 'center'
      });
    
    this.addFooter(pageNumber);
    
    return this.doc;
  }
}

// Función principal para generar el PDF
async function generatePresentationPDF() {
  try {
    console.log('🚀 Iniciando generación del PDF de presentación...');
    
    const generator = new PresentationPDFGenerator();
    const doc = await generator.generatePDF();
    
    // Crear directorio si no existe
    const outputDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Guardar el PDF
    const outputPath = path.join(outputDir, 'Presentacion-GrowX5-Profesional.pdf');
    const stream = fs.createWriteStream(outputPath);
    
    doc.pipe(stream);
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        console.log('✅ PDF generado exitosamente:', outputPath);
        console.log('📄 Archivo disponible en:', outputPath);
        resolve(outputPath);
      });
      
      stream.on('error', (error) => {
        console.error('❌ Error al guardar el PDF:', error);
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('❌ Error al generar el PDF:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generatePresentationPDF()
    .then((path) => {
      console.log('🎉 Proceso completado. PDF disponible en:', path);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { generatePresentationPDF, PresentationPDFGenerator };