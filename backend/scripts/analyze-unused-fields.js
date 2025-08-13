const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Script para analizar campos no utilizados en los modelos de MongoDB
 * Identifica campos que están definidos en los esquemas pero no se usan en el código
 */

// Campos a analizar por modelo
const FIELDS_TO_ANALYZE = {
  User: [
    'referrals', // Array embebido obsoleto
    'investments.totalInvested',
    'investments.activeInvestments', 
    'investments.completedInvestments',
    'investments.totalReturns',
    'investments.expectedReturns',
    'investments.portfolioValue',
    'investments.averageROI',
    'activity.loginCount',
    'activity.transactionCount', 
    'activity.referralCount',
    'activity.investmentCount',
    'package_status', // Duplicado con UserStatus
    'current_package', // Duplicado con UserStatus
    'isPioneer', // Duplicado con UserStatus
    'pioneerDetails.level', // Duplicado con UserStatus
    'balance', // Duplicado con UserStatus
    'totalEarnings' // Duplicado con UserStatus
  ],
  Transaction: [
    'pioneerPlan.plan',
    'pioneerPlan.duration',
    'pioneerPlan.originalPrice',
    'pioneerPlan.discount',
    'pioneerPlan.finalPrice',
    'invoiceId',
    'externalReference'
  ],
  Commission: [
    'metadata.weekNumber', // Posiblemente no usado
    'metadata.cycleNumber', // Posiblemente no usado
    'metadata.dayInCycle' // Posiblemente no usado
  ],
  Package: [
    'commissionConfig.levelCommissions', // Si no se usa sistema multinivel
    'benefitConfig.pauseDays' // Si no se implementó pausa
  ]
};

// Directorios a buscar
const SEARCH_DIRECTORIES = [
  path.join(__dirname, '../src/controllers'),
  path.join(__dirname, '../src/routes'),
  path.join(__dirname, '../src/services'),
  path.join(__dirname, '../src/middleware'),
  path.join(__dirname, '../src/utils'),
  path.join(__dirname, '../../frontend/src')
];

/**
 * Busca referencias a un campo en todos los archivos
 */
function searchFieldInFiles(fieldPath, directories) {
  const references = [];
  
  function searchInDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        searchInDirectory(filePath);
      } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Buscar diferentes patrones de uso del campo
          const patterns = [
            new RegExp(`\\b${fieldPath.replace(/\./g, '\\.')}\\b`, 'g'),
            new RegExp(`['"]${fieldPath}['"]`, 'g'),
            new RegExp(`\\$set.*${fieldPath.replace(/\./g, '\\.')}`, 'g'),
            new RegExp(`\\$unset.*${fieldPath.replace(/\./g, '\\.')}`, 'g'),
            new RegExp(`populate.*${fieldPath.replace(/\./g, '\\.')}`, 'g')
          ];
          
          for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches) {
              references.push({
                file: filePath.replace(process.cwd(), ''),
                matches: matches.length,
                pattern: pattern.source
              });
              break; // Solo contar una vez por archivo
            }
          }
        } catch (error) {
          // Ignorar errores de lectura
        }
      }
    }
  }
  
  directories.forEach(searchInDirectory);
  return references;
}

/**
 * Analiza el uso de campos en la base de datos
 */
async function analyzeFieldUsageInDB(model, fieldPath) {
  try {
    const Model = mongoose.model(model);
    
    // Contar documentos que tienen el campo definido
    const totalDocs = await Model.countDocuments();
    const docsWithField = await Model.countDocuments({
      [fieldPath]: { $exists: true, $ne: null }
    });
    
    // Contar documentos con valores no vacíos
    let docsWithValue = 0;
    try {
      docsWithValue = await Model.countDocuments({
        [fieldPath]: { $exists: true, $ne: null, $ne: '', $ne: 0, $ne: [] }
      });
    } catch (error) {
      // El campo podría no existir o tener un tipo diferente
      docsWithValue = docsWithField;
    }
    
    return {
      totalDocuments: totalDocs,
      documentsWithField: docsWithField,
      documentsWithValue: docsWithValue,
      usagePercentage: totalDocs > 0 ? ((docsWithValue / totalDocs) * 100).toFixed(2) : 0
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

/**
 * Función principal de análisis
 */
async function analyzeUnusedFields() {
  console.log('🔍 ANÁLISIS DE CAMPOS NO UTILIZADOS - GROW5X');
  console.log('=' .repeat(60));
  
  try {
    // Conectar a MongoDB
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');
    
    const results = {
      timestamp: new Date().toISOString(),
      analysis: {},
      summary: {
        totalFieldsAnalyzed: 0,
        unusedInCode: 0,
        unusedInDB: 0,
        recommendations: []
      }
    };
    
    // Analizar cada modelo
    for (const [modelName, fields] of Object.entries(FIELDS_TO_ANALYZE)) {
      console.log(`📊 Analizando modelo: ${modelName}`);
      console.log('-'.repeat(40));
      
      results.analysis[modelName] = {};
      
      for (const fieldPath of fields) {
        console.log(`   🔍 Campo: ${fieldPath}`);
        
        // Buscar en código
        const codeReferences = searchFieldInFiles(fieldPath, SEARCH_DIRECTORIES);
        
        // Analizar en base de datos
        const dbUsage = await analyzeFieldUsageInDB(modelName, fieldPath);
        
        const fieldAnalysis = {
          fieldPath,
          codeReferences: {
            found: codeReferences.length > 0,
            count: codeReferences.length,
            files: codeReferences
          },
          databaseUsage: dbUsage,
          recommendation: ''
        };
        
        // Generar recomendación
        if (codeReferences.length === 0 && dbUsage.usagePercentage < 5) {
          fieldAnalysis.recommendation = '🗑️ ELIMINAR - No usado en código ni DB';
          results.summary.unusedInCode++;
          results.summary.unusedInDB++;
        } else if (codeReferences.length === 0) {
          fieldAnalysis.recommendation = '⚠️ REVISAR - No usado en código pero tiene datos';
          results.summary.unusedInCode++;
        } else if (dbUsage.usagePercentage < 5) {
          fieldAnalysis.recommendation = '📊 MONITOREAR - Usado en código pero pocos datos';
          results.summary.unusedInDB++;
        } else {
          fieldAnalysis.recommendation = '✅ MANTENER - Usado activamente';
        }
        
        results.analysis[modelName][fieldPath] = fieldAnalysis;
        results.summary.totalFieldsAnalyzed++;
        
        console.log(`      Código: ${codeReferences.length > 0 ? '✅' : '❌'} (${codeReferences.length} refs)`);
        console.log(`      DB: ${dbUsage.usagePercentage}% uso`);
        console.log(`      ${fieldAnalysis.recommendation}\n`);
      }
    }
    
    // Generar recomendaciones generales
    results.summary.recommendations = [
      `${results.summary.unusedInCode} campos no utilizados en código`,
      `${results.summary.unusedInDB} campos con bajo uso en DB`,
      'Revisar campos duplicados entre User y UserStatus',
      'Considerar migración de datos antes de eliminar campos',
      'Implementar monitoreo de uso de campos críticos'
    ];
    
    // Guardar resultados
    const outputPath = path.join(__dirname, '../analysis-unused-fields-report.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    
    // Mostrar resumen
    console.log('\n📋 RESUMEN DEL ANÁLISIS');
    console.log('=' .repeat(60));
    console.log(`📊 Total de campos analizados: ${results.summary.totalFieldsAnalyzed}`);
    console.log(`🗑️ Campos no usados en código: ${results.summary.unusedInCode}`);
    console.log(`📉 Campos con bajo uso en DB: ${results.summary.unusedInDB}`);
    console.log(`\n💾 Reporte completo guardado en: ${outputPath}`);
    
    console.log('\n🎯 RECOMENDACIONES PRINCIPALES:');
    results.summary.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Ejecutar análisis
if (require.main === module) {
  analyzeUnusedFields()
    .then(() => {
      console.log('\n✨ Análisis completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { analyzeUnusedFields, searchFieldInFiles, analyzeFieldUsageInDB };