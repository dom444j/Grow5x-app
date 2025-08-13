const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Configuración de colores y estilos mejorados
const colors = {
  primary: '#1E40AF',     // Azul principal
  secondary: '#3B82F6',   // Azul secundario
  accent: '#10B981',      // Verde para destacar
  warning: '#F59E0B',     // Amarillo/naranja para advertencias
  danger: '#EF4444',      // Rojo para riesgos
  success: '#059669',     // Verde éxito
  text: '#1F2937',        // Gris oscuro para texto
  lightText: '#6B7280',   // Gris claro para texto secundario
  background: '#F9FAFB',  // Fondo claro
  gradient1: '#667EEA',   // Gradiente 1
  gradient2: '#764BA2'    // Gradiente 2
};

class EnhancedPresentationPDFGenerator {
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
        Title: 'Presentación del Proyecto GrowX5 - Versión Profesional',
        Author: 'GrowX5',
        Subject: 'Documento de Presentación Profesional para Usuarios y Difusión',
        Keywords: 'GrowX5, Criptomonedas, Arbitraje, IA, Inversión, Profesional'
      }
    });
    
    this.currentY = 50;
    this.pageWidth = 595.28; // A4 width in points
    this.pageHeight = 841.89; // A4 height in points
    this.margin = 50;
    this.contentWidth = this.pageWidth - (this.margin * 2);
  }

  // Método para crear gradientes
  createGradient(x, y, width, height, color1, color2) {
    const gradient = this.doc.linearGradient(x, y, x + width, y + height);
    gradient.stop(0, color1).stop(1, color2);
    return gradient;
  }

  // Crear iconos SVG simples
  drawIcon(type, x, y, size = 20) {
    this.doc.save();
    
    switch (type) {
      case 'rocket':
        // Dibujar cohete simple
        this.doc
          .fillColor(colors.primary)
          .circle(x + size/2, y + size/2, size/3)
          .fill()
          .moveTo(x + size/2, y)
          .lineTo(x + size/4, y + size)
          .lineTo(x + 3*size/4, y + size)
          .closePath()
          .fill();
        break;
        
      case 'chart':
        // Dibujar gráfico de barras
        this.doc.fillColor(colors.accent);
        for (let i = 0; i < 4; i++) {
          const barHeight = (i + 1) * size / 6;
          this.doc.rect(x + i * size/5, y + size - barHeight, size/6, barHeight).fill();
        }
        break;
        
      case 'shield':
        // Dibujar escudo
        this.doc
          .fillColor(colors.success)
          .moveTo(x + size/2, y)
          .lineTo(x, y + size/3)
          .lineTo(x, y + 2*size/3)
          .lineTo(x + size/2, y + size)
          .lineTo(x + size, y + 2*size/3)
          .lineTo(x + size, y + size/3)
          .closePath()
          .fill();
        break;
        
      case 'star':
        // Dibujar estrella
        this.doc.fillColor(colors.warning);
        const centerX = x + size/2;
        const centerY = y + size/2;
        const outerRadius = size/2;
        const innerRadius = size/4;
        
        this.doc.moveTo(centerX, centerY - outerRadius);
        for (let i = 1; i < 10; i++) {
          const angle = (i * Math.PI) / 5;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const pointX = centerX + Math.sin(angle) * radius;
          const pointY = centerY - Math.cos(angle) * radius;
          this.doc.lineTo(pointX, pointY);
        }
        this.doc.closePath().fill();
        break;
        
      case 'gear':
        // Dibujar engranaje simple
        this.doc
          .fillColor(colors.secondary)
          .circle(x + size/2, y + size/2, size/3)
          .fill()
          .circle(x + size/2, y + size/2, size/6)
          .fillColor('white')
          .fill();
        break;
    }
    
    this.doc.restore();
  }

  // Crear gráfico de progreso circular
  drawProgressCircle(x, y, radius, percentage, color) {
    const centerX = x + radius;
    const centerY = y + radius;
    
    // Círculo de fondo
    this.doc
      .circle(centerX, centerY, radius)
      .strokeColor('#E5E7EB')
      .lineWidth(8)
      .stroke();
    
    // Arco de progreso
    const angle = (percentage / 100) * 2 * Math.PI;
    this.doc
      .arc(centerX, centerY, radius, -Math.PI/2, -Math.PI/2 + angle)
      .strokeColor(color)
      .lineWidth(8)
      .stroke();
    
    // Texto del porcentaje
    this.doc
      .fontSize(16)
      .fillColor(color)
      .font('Helvetica-Bold')
      .text(`${percentage}%`, centerX - 20, centerY - 8, {
        width: 40,
        align: 'center'
      });
  }

  // Crear gráfico de barras
  drawBarChart(x, y, width, height, data, labels) {
    const barWidth = width / data.length;
    const maxValue = Math.max(...data);
    
    // Dibujar barras
    data.forEach((value, index) => {
      const barHeight = (value / maxValue) * height;
      const barX = x + index * barWidth + barWidth * 0.1;
      const barY = y + height - barHeight;
      
      // Gradiente para la barra
      const gradient = this.createGradient(barX, barY, barWidth * 0.8, barHeight, colors.primary, colors.secondary);
      
      this.doc
        .rect(barX, barY, barWidth * 0.8, barHeight)
        .fill(gradient);
      
      // Etiqueta
      if (labels && labels[index]) {
        this.doc
          .fontSize(8)
          .fillColor(colors.text)
          .text(labels[index], barX, y + height + 5, {
            width: barWidth * 0.8,
            align: 'center'
          });
      }
      
      // Valor
      this.doc
        .fontSize(10)
        .fillColor('white')
        .font('Helvetica-Bold')
        .text(value.toString(), barX, barY + barHeight/2 - 5, {
          width: barWidth * 0.8,
          align: 'center'
        });
    });
  }

  // Método para agregar una nueva página con diseño mejorado
  addPage() {
    this.doc.addPage();
    this.currentY = 50;
    this.addEnhancedHeader();
  }

  // Verificar si necesitamos una nueva página
  checkPageBreak(requiredHeight = 100) {
    if (this.currentY + requiredHeight > this.pageHeight - this.margin) {
      this.addPage();
    }
  }

  // Agregar encabezado mejorado en cada página
  addEnhancedHeader() {
    // Gradiente de fondo para el encabezado
    const headerGradient = this.createGradient(0, 0, this.pageWidth, 40, colors.primary, colors.secondary);
    
    this.doc
      .rect(0, 0, this.pageWidth, 40)
      .fill(headerGradient);
    
    // Logo/Icono
    this.drawIcon('rocket', this.margin, 10, 20);
    
    // Texto del encabezado
    this.doc
      .fontSize(12)
      .fillColor('white')
      .font('Helvetica-Bold')
      .text('GrowX5 - Herramienta Tecnológica Avanzada', this.margin + 30, 15);
    
    this.doc
      .fontSize(8)
      .fillColor('white')
      .font('Helvetica')
      .text('Documento Profesional', this.pageWidth - this.margin - 100, 20, { align: 'right' });
  }

  // Agregar pie de página mejorado
  addEnhancedFooter(pageNumber) {
    const footerY = this.pageHeight - 40;
    
    // Gradiente de fondo para el pie
    const footerGradient = this.createGradient(0, footerY, this.pageWidth, 40, colors.secondary, colors.primary);
    
    this.doc
      .rect(0, footerY, this.pageWidth, 40)
      .fill(footerGradient);
    
    // Número de página con diseño
    this.doc
      .circle(this.pageWidth/2, footerY + 20, 15)
      .fillColor('white')
      .fill()
      .fontSize(10)
      .fillColor(colors.primary)
      .font('Helvetica-Bold')
      .text(pageNumber.toString(), this.pageWidth/2 - 5, footerY + 15);
    
    // Copyright
    this.doc
      .fontSize(8)
      .fillColor('white')
      .font('Helvetica')
      .text('© 2024 GrowX5. Herramienta Tecnológica - Use bajo su propia responsabilidad.', 
            this.margin, footerY + 25, { align: 'center', width: this.contentWidth });
  }

  // Agregar título principal con diseño mejorado
  addEnhancedMainTitle(title, subtitle = null) {
    this.checkPageBreak(150);
    
    // Fondo con gradiente para el título
    const titleGradient = this.createGradient(this.margin - 20, this.currentY - 20, 
                                            this.contentWidth + 40, 120, 
                                            colors.gradient1, colors.gradient2);
    
    this.doc
      .rect(this.margin - 20, this.currentY - 20, this.contentWidth + 40, 120)
      .fill(titleGradient);
    
    // Decoración con iconos
    this.drawIcon('rocket', this.margin - 10, this.currentY - 10, 30);
    this.drawIcon('star', this.pageWidth - this.margin - 20, this.currentY - 10, 30);
    
    // Título principal
    this.doc
      .fontSize(32)
      .fillColor('white')
      .font('Helvetica-Bold')
      .text(title, this.margin, this.currentY + 15, {
        width: this.contentWidth,
        align: 'center'
      });
    
    this.currentY += 55;
    
    if (subtitle) {
      this.doc
        .fontSize(16)
        .fillColor('white')
        .font('Helvetica')
        .text(subtitle, this.margin, this.currentY, {
          width: this.contentWidth,
          align: 'center'
        });
      this.currentY += 30;
    }
    
    this.currentY += 40;
  }

  // Agregar sección con diseño mejorado
  addEnhancedSection(title, icon = null) {
    this.checkPageBreak(80);
    
    // Fondo de sección con gradiente sutil
    const sectionGradient = this.createGradient(this.margin - 10, this.currentY - 10, 
                                              this.contentWidth + 20, 50, 
                                              colors.background, 'white');
    
    this.doc
      .rect(this.margin - 10, this.currentY - 10, this.contentWidth + 20, 50)
      .fill(sectionGradient)
      .strokeColor(colors.primary)
      .lineWidth(2)
      .stroke();
    
    // Icono de sección
    if (icon) {
      this.drawIcon(icon, this.margin, this.currentY + 5, 25);
    }
    
    // Título de sección
    this.doc
      .fontSize(20)
      .fillColor(colors.primary)
      .font('Helvetica-Bold')
      .text(title, this.margin + (icon ? 35 : 10), this.currentY + 10);
    
    this.currentY += 60;
  }

  // Agregar caja de estadísticas
  addStatsBox(stats) {
    this.checkPageBreak(120);
    
    const boxWidth = this.contentWidth / stats.length;
    
    stats.forEach((stat, index) => {
      const x = this.margin + index * boxWidth;
      
      // Fondo de la caja
      this.doc
        .rect(x + 5, this.currentY, boxWidth - 10, 80)
        .fillAndStroke(colors.background, colors.primary);
      
      // Icono
      if (stat.icon) {
        this.drawIcon(stat.icon, x + boxWidth/2 - 12, this.currentY + 10, 24);
      }
      
      // Valor
      this.doc
        .fontSize(18)
        .fillColor(colors.primary)
        .font('Helvetica-Bold')
        .text(stat.value, x + 10, this.currentY + 40, {
          width: boxWidth - 20,
          align: 'center'
        });
      
      // Label
      this.doc
        .fontSize(10)
        .fillColor(colors.text)
        .font('Helvetica')
        .text(stat.label, x + 10, this.currentY + 60, {
          width: boxWidth - 20,
          align: 'center'
        });
    });
    
    this.currentY += 100;
  }

  // Agregar tabla mejorada
  addEnhancedTable(headers, rows, options = {}) {
    const tableWidth = this.contentWidth;
    const colWidth = tableWidth / headers.length;
    const rowHeight = options.rowHeight || 30;
    
    this.checkPageBreak(rowHeight * (rows.length + 2));
    
    const startY = this.currentY;
    
    // Encabezados con gradiente
    const headerGradient = this.createGradient(this.margin, startY, tableWidth, rowHeight, 
                                             colors.primary, colors.secondary);
    
    this.doc
      .rect(this.margin, startY, tableWidth, rowHeight)
      .fill(headerGradient);
    
    headers.forEach((header, i) => {
      this.doc
        .fontSize(11)
        .fillColor('white')
        .font('Helvetica-Bold')
        .text(header, this.margin + (i * colWidth) + 8, startY + 10, {
          width: colWidth - 16,
          align: 'center'
        });
    });
    
    // Filas con diseño alternado
    rows.forEach((row, rowIndex) => {
      const y = startY + rowHeight * (rowIndex + 1);
      
      // Fondo alternado con gradientes sutiles
      if (rowIndex % 2 === 0) {
        const rowGradient = this.createGradient(this.margin, y, tableWidth, rowHeight, 
                                              colors.background, 'white');
        this.doc
          .rect(this.margin, y, tableWidth, rowHeight)
          .fill(rowGradient)
          .strokeColor(colors.lightText)
          .stroke();
      } else {
        this.doc
          .rect(this.margin, y, tableWidth, rowHeight)
          .fillAndStroke('white', colors.lightText);
      }
      
      row.forEach((cell, colIndex) => {
        this.doc
          .fontSize(10)
          .fillColor(colors.text)
          .font('Helvetica')
          .text(cell, this.margin + (colIndex * colWidth) + 8, y + 10, {
            width: colWidth - 16,
            align: 'center'
          });
      });
    });
    
    this.currentY = startY + rowHeight * (rows.length + 1) + 20;
  }

  // Agregar gráfico de retornos
  addReturnsChart() {
    this.checkPageBreak(200);
    
    this.addEnhancedSection('Visualización de Retornos', 'chart');
    
    // Datos para el gráfico
    const investments = [50, 100, 250, 500, 1000];
    const returns = [250, 500, 1250, 2500, 5000];
    const labels = ['$50', '$100', '$250', '$500', '$1K'];
    
    // Título del gráfico
    this.doc
      .fontSize(14)
      .fillColor(colors.text)
      .font('Helvetica-Bold')
      .text('Proyección de Retornos por Inversión', this.margin, this.currentY, {
        width: this.contentWidth,
        align: 'center'
      });
    
    this.currentY += 30;
    
    // Dibujar gráfico de barras
    this.drawBarChart(this.margin + 50, this.currentY, this.contentWidth - 100, 120, 
                     [250, 500, 1250, 2500, 5000], labels);
    
    this.currentY += 160;
  }

  // Agregar sección de progreso de ciclos
  addCycleProgress() {
    this.checkPageBreak(180);
    
    this.addEnhancedSection('Progreso de Ciclos', 'gear');
    
    const cycles = [
      { name: 'Ciclo 1', progress: 100, color: colors.success },
      { name: 'Ciclo 2', progress: 100, color: colors.primary },
      { name: 'Ciclo 3', progress: 100, color: colors.secondary },
      { name: 'Ciclo 4', progress: 100, color: colors.accent },
      { name: 'Ciclo 5', progress: 100, color: colors.warning }
    ];
    
    const circleSize = 60;
    const spacing = (this.contentWidth - (cycles.length * circleSize)) / (cycles.length + 1);
    
    cycles.forEach((cycle, index) => {
      const x = this.margin + spacing + index * (circleSize + spacing);
      
      // Dibujar círculo de progreso
      this.drawProgressCircle(x, this.currentY, circleSize/2, cycle.progress, cycle.color);
      
      // Etiqueta del ciclo
      this.doc
        .fontSize(10)
        .fillColor(colors.text)
        .font('Helvetica-Bold')
        .text(cycle.name, x, this.currentY + circleSize + 10, {
          width: circleSize,
          align: 'center'
        });
    });
    
    this.currentY += circleSize + 40;
  }

  // Generar el PDF completo mejorado
  async generateEnhancedPDF() {
    let pageNumber = 1;
    
    // Página de portada mejorada
    this.addEnhancedMainTitle('🚀 Presentación del Proyecto GrowX5', 
                             'Herramienta Tecnológica Avanzada para Arbitraje de Criptomonedas');
    
    // Información de versión con diseño
    this.doc
      .rect(this.margin + 100, this.currentY, this.contentWidth - 200, 60)
      .fillAndStroke(colors.background, colors.primary);
    
    this.doc
      .fontSize(12)
      .fillColor(colors.primary)
      .font('Helvetica-Bold')
      .text('Diciembre 2024 • Versión 1.0 • Documento Profesional', 
            this.margin + 110, this.currentY + 20, {
              width: this.contentWidth - 220,
              align: 'center'
            });
    
    this.currentY += 80;
    
    // Estadísticas principales
    this.addStatsBox([
      { icon: 'star', value: '500%', label: 'Retorno Objetivo' },
      { icon: 'chart', value: '12.5%', label: 'Diario Activo' },
      { icon: 'gear', value: '45', label: 'Días Totales' },
      { icon: 'shield', value: '24/7', label: 'Soporte IA' }
    ]);
    
    // Advertencia mejorada
    this.doc
      .rect(this.margin - 10, this.currentY, this.contentWidth + 20, 80)
      .fillAndStroke('#FEF3C7', colors.danger)
      .lineWidth(3);
    
    this.drawIcon('shield', this.margin, this.currentY + 10, 30);
    
    this.doc
      .fontSize(14)
      .fillColor(colors.danger)
      .font('Helvetica-Bold')
      .text('⚠️ ADVERTENCIA IMPORTANTE', this.margin + 40, this.currentY + 15);
    
    this.doc
      .fontSize(11)
      .fillColor(colors.text)
      .font('Helvetica')
      .text('La participación en GrowX5 implica riesgos significativos. No invierta fondos que no esté dispuesto a perder. No se garantiza rentabilidad ni retorno del capital.', 
            this.margin + 10, this.currentY + 40, {
              width: this.contentWidth - 20,
              lineGap: 3
            });
    
    this.currentY += 100;
    
    this.addEnhancedFooter(pageNumber++);
    
    // Página 2: ¿Qué es GrowX5? con visualizaciones
    this.addPage();
    this.addEnhancedSection('¿Qué es GrowX5?', 'rocket');
    
    this.doc
      .fontSize(12)
      .fillColor(colors.text)
      .font('Helvetica')
      .text('GrowX5 es una herramienta tecnológica avanzada que utiliza inteligencia artificial para la gestión automatizada de estrategias de arbitraje en mercados de criptomonedas.', 
            this.margin, this.currentY, {
              width: this.contentWidth,
              lineGap: 4
            });
    
    this.currentY += 50;
    
    // Características con iconos
    const features = [
      { icon: 'gear', text: 'Herramienta Autónoma: Sistema que opera con agentes de IA' },
      { icon: 'chart', text: 'Inteligencia Artificial: Algoritmos para estrategias de arbitraje' },
      { icon: 'star', text: 'Objetivo de Retornos: Aspira a lograr hasta 500% de retorno total' },
      { icon: 'shield', text: 'Seguridad Avanzada: Protocolos de seguridad implementados' }
    ];
    
    features.forEach(feature => {
      this.checkPageBreak(40);
      
      this.drawIcon(feature.icon, this.margin, this.currentY, 20);
      
      this.doc
        .fontSize(11)
        .fillColor(colors.text)
        .font('Helvetica')
        .text(feature.text, this.margin + 30, this.currentY + 5, {
          width: this.contentWidth - 30,
          lineGap: 3
        });
      
      this.currentY += 35;
    });
    
    this.addEnhancedFooter(pageNumber++);
    
    // Página 3: Sistema de Beneficios con gráficos
    this.addPage();
    this.addEnhancedSection('Sistema de Beneficios', 'chart');
    
    // Agregar gráfico de retornos
    this.addReturnsChart();
    
    // Agregar progreso de ciclos
    this.addCycleProgress();
    
    this.addEnhancedFooter(pageNumber++);
    
    // Página 4: Tabla de retornos mejorada
    this.addPage();
    this.addEnhancedSection('Calculadora de Retornos Detallada', 'star');
    
    const tableHeaders = ['Inversión Inicial', 'Ganancia Total', 'Total Final', 'ROI', 'Ganancia Diaria'];
    const tableRows = [
      ['$50 USDT', '$200 USDT', '$250 USDT', '400%', '$6.25'],
      ['$100 USDT', '$400 USDT', '$500 USDT', '400%', '$12.50'],
      ['$250 USDT', '$1,000 USDT', '$1,250 USDT', '400%', '$31.25'],
      ['$500 USDT', '$2,000 USDT', '$2,500 USDT', '400%', '$62.50'],
      ['$1,000 USDT', '$4,000 USDT', '$5,000 USDT', '400%', '$125.00']
    ];
    
    this.addEnhancedTable(tableHeaders, tableRows);
    
    // Ejemplo ilustrativo con diseño
    this.doc
      .rect(this.margin, this.currentY, this.contentWidth, 100)
      .fillAndStroke('#ECFDF5', colors.success);
    
    this.drawIcon('star', this.margin + 10, this.currentY + 10, 25);
    
    this.doc
      .fontSize(14)
      .fillColor(colors.success)
      .font('Helvetica-Bold')
      .text('Ejemplo Ilustrativo - Licencia $1,000 USDT', this.margin + 45, this.currentY + 15);
    
    const examplePoints = [
      'Primer ciclo: Objetivo de cashback del 100% ($1,000)',
      'Ciclos 2-5: Objetivo de $1,000 por ciclo en beneficios',
      'Objetivo total: $5,000 USDT (sujeto a condiciones del mercado)'
    ];
    
    examplePoints.forEach((point, index) => {
      this.doc
        .fontSize(10)
        .fillColor(colors.text)
        .font('Helvetica')
        .text(`• ${point}`, this.margin + 15, this.currentY + 45 + index * 15, {
          width: this.contentWidth - 30
        });
    });
    
    this.currentY += 120;
    
    this.addEnhancedFooter(pageNumber++);
    
    // Continuar con el resto del contenido...
    // (El resto del contenido seguiría el mismo patrón mejorado)
    
    // Página final con diseño especial
    this.addPage();
    this.currentY = this.pageHeight / 2 - 150;
    
    // Fondo final con gradiente
    const finalGradient = this.createGradient(this.margin - 20, this.currentY - 20, 
                                            this.contentWidth + 40, 200, 
                                            colors.primary, colors.secondary);
    
    this.doc
      .rect(this.margin - 20, this.currentY - 20, this.contentWidth + 40, 200)
      .fill(finalGradient);
    
    // Iconos decorativos
    this.drawIcon('rocket', this.margin, this.currentY, 40);
    this.drawIcon('star', this.pageWidth - this.margin - 40, this.currentY, 40);
    
    this.doc
      .fontSize(24)
      .fillColor('white')
      .font('Helvetica-Bold')
      .text('© 2024 GrowX5', this.margin, this.currentY + 60, {
        width: this.contentWidth,
        align: 'center'
      });
    
    this.doc
      .fontSize(16)
      .fillColor('white')
      .font('Helvetica')
      .text('Herramienta Tecnológica Profesional', this.margin, this.currentY + 100, {
        width: this.contentWidth,
        align: 'center'
      });
    
    this.doc
      .fontSize(12)
      .fillColor('white')
      .font('Helvetica')
      .text('Use bajo su propia responsabilidad', this.margin, this.currentY + 130, {
        width: this.contentWidth,
        align: 'center'
      });
    
    this.addEnhancedFooter(pageNumber);
    
    return this.doc;
  }
}

// Función principal para generar el PDF mejorado
async function generateEnhancedPresentationPDF() {
  try {
    console.log('🚀 Iniciando generación del PDF de presentación MEJORADO...');
    
    const generator = new EnhancedPresentationPDFGenerator();
    const doc = await generator.generateEnhancedPDF();
    
    // Crear directorio si no existe
    const outputDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Guardar el PDF
    const outputPath = path.join(outputDir, 'Presentacion-GrowX5-Premium.pdf');
    const stream = fs.createWriteStream(outputPath);
    
    doc.pipe(stream);
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        console.log('✅ PDF PREMIUM generado exitosamente:', outputPath);
        console.log('📄 Archivo disponible en:', outputPath);
        console.log('🎨 Incluye: Gradientes, iconos SVG, gráficos y diseño profesional');
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
  generateEnhancedPresentationPDF()
    .then((path) => {
      console.log('🎉 Proceso completado. PDF PREMIUM disponible en:', path);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { generateEnhancedPresentationPDF, EnhancedPresentationPDFGenerator };