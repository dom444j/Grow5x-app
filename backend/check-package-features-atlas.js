#!/usr/bin/env node

/**
 * Script para verificar las características de los paquetes en MongoDB Atlas
 * y corregir el problema de las claves de traducción
 */

const { MongoClient } = require('mongodb');

// URI de MongoDB Atlas desde el .env de producción
const MONGODB_URI = 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority';

async function checkPackageFeatures() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        console.log('🔍 Conectando a MongoDB Atlas...');
        await client.connect();
        
        const db = client.db('growx5');
        const packagesCollection = db.collection('packages');
        
        console.log('\n📦 Verificando paquetes existentes...');
        const packageCount = await packagesCollection.countDocuments();
        console.log(`Total de paquetes: ${packageCount}`);
        
        if (packageCount === 0) {
            console.log('❌ No se encontraron paquetes en la base de datos.');
            return;
        }
        
        console.log('\n📋 Características actuales de los paquetes:');
        console.log('='.repeat(50));
        
        const packages = await packagesCollection.find({}, {
            name: 1,
            features: 1,
            price: 1
        }).toArray();
        
        packages.forEach((pkg, index) => {
            console.log(`\n${index + 1}. Paquete: ${pkg.name}`);
            console.log(`   Precio: $${pkg.price}`);
            console.log(`   Características:`);
            
            if (pkg.features && Array.isArray(pkg.features)) {
                pkg.features.forEach((feature, i) => {
                    console.log(`     ${i + 1}. ${feature}`);
                });
            } else {
                console.log('     ❌ Sin características definidas');
            }
        });
        
        // Verificar si las características contienen claves de traducción
        const hasTranslationKeys = packages.some(pkg => 
            pkg.features && pkg.features.some(feature => 
                typeof feature === 'string' && feature.includes('packages.')
            )
        );
        
        if (hasTranslationKeys) {
            console.log('\n⚠️  PROBLEMA DETECTADO:');
            console.log('Las características contienen claves de traducción en lugar de texto.');
            console.log('\n🔧 SOLUCIÓN NECESARIA:');
            console.log('Actualizar las características con texto en español.');
            
            // Definir las características correctas en español
            const correctFeatures = {
                'Licencia Starter': [
                    'Acceso básico a la plataforma',
                    'Dashboard de inversiones',
                    'Soporte por email',
                    'Reportes mensuales',
                    'Acceso a webinars',
                    'Comunidad de inversores'
                ],
                'Licencia Basic': [
                    'Todo lo de Starter',
                    'Análisis de mercado avanzado',
                    'Alertas de trading',
                    'Soporte prioritario',
                    'Reportes semanales',
                    'Acceso a estrategias premium'
                ],
                'Licencia Standard': [
                    'Todo lo de Basic',
                    'Trading automatizado',
                    'Asesoría personalizada',
                    'Soporte 24/7',
                    'Reportes diarios',
                    'Acceso VIP a eventos'
                ]
            };
            
            console.log('\n📝 Características correctas definidas:');
            Object.entries(correctFeatures).forEach(([name, features]) => {
                console.log(`\n${name}:`);
                features.forEach((feature, i) => {
                    console.log(`  ${i + 1}. ${feature}`);
                });
            });
            
        } else {
            console.log('\n✅ Las características están correctamente definidas.');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
        console.log('\n🔌 Conexión cerrada.');
    }
}

checkPackageFeatures();