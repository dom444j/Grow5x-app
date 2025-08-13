#!/usr/bin/env node

/**
 * VERIFICACIÓN COMPLETA DE CONFIGURACIÓN DNS Y EMAIL
 * 
 * Este script verifica:
 * 1. Registros DNS (MX, SPF, DKIM)
 * 2. Conectividad SMTP
 * 3. Envío de email de prueba
 * 4. Estado general del sistema
 */

const dns = require('dns').promises;
const nodemailer = require('nodemailer');
require('dotenv').config();

const DOMAIN = 'grow5x.app';
const EXPECTED_MX = ['mx1.privateemail.com', 'mx2.privateemail.com'];
const EXPECTED_SPF = 'v=spf1 include:spf.privateemail.com ~all';

// Colores para la consola
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStatus(check, status, details = '') {
    const icon = status ? '✅' : '❌';
    const color = status ? 'green' : 'red';
    log(`${icon} ${check}`, color);
    if (details) {
        log(`   ${details}`, 'blue');
    }
}

async function verificarRegistrosMX() {
    log('\n🔍 VERIFICANDO REGISTROS MX...', 'bold');
    
    try {
        const records = await dns.resolveMx(DOMAIN);
        
        if (records.length === 0) {
            logStatus('Registros MX', false, 'No se encontraron registros MX');
            return false;
        }
        
        const mxHosts = records.map(r => r.exchange.toLowerCase());
        const hasCorrectMX = EXPECTED_MX.every(expected => 
            mxHosts.some(host => host.includes(expected.toLowerCase()))
        );
        
        logStatus('Registros MX', hasCorrectMX, 
            hasCorrectMX 
                ? `Encontrados: ${mxHosts.join(', ')}`
                : `Esperados: ${EXPECTED_MX.join(', ')}, Encontrados: ${mxHosts.join(', ')}`
        );
        
        return hasCorrectMX;
    } catch (error) {
        logStatus('Registros MX', false, `Error: ${error.message}`);
        return false;
    }
}

async function verificarRegistroSPF() {
    log('\n🔍 VERIFICANDO REGISTRO SPF...', 'bold');
    
    try {
        const records = await dns.resolveTxt(DOMAIN);
        const spfRecord = records.find(record => 
            record.join('').includes('v=spf1')
        );
        
        if (!spfRecord) {
            logStatus('Registro SPF', false, 'No se encontró registro SPF');
            return false;
        }
        
        const spfValue = spfRecord.join('');
        const hasCorrectSPF = spfValue.includes('include:spf.privateemail.com');
        
        logStatus('Registro SPF', hasCorrectSPF, 
            hasCorrectSPF 
                ? `Correcto: ${spfValue}`
                : `Esperado: ${EXPECTED_SPF}, Encontrado: ${spfValue}`
        );
        
        return hasCorrectSPF;
    } catch (error) {
        logStatus('Registro SPF', false, `Error: ${error.message}`);
        return false;
    }
}

async function verificarRegistroDKIM() {
    log('\n🔍 VERIFICANDO REGISTRO DKIM...', 'bold');
    
    try {
        const dkimDomain = `default._domainkey.${DOMAIN}`;
        const records = await dns.resolveTxt(dkimDomain);
        
        if (records.length === 0) {
            logStatus('Registro DKIM', false, 'No se encontró registro DKIM');
            return false;
        }
        
        const dkimRecord = records[0].join('');
        const hasValidDKIM = dkimRecord.includes('v=DKIM1') && dkimRecord.includes('p=');
        
        logStatus('Registro DKIM', hasValidDKIM, 
            hasValidDKIM 
                ? `Configurado correctamente (${dkimRecord.length} caracteres)`
                : `Registro inválido: ${dkimRecord.substring(0, 100)}...`
        );
        
        return hasValidDKIM;
    } catch (error) {
        logStatus('Registro DKIM', false, `Error: ${error.message}`);
        return false;
    }
}

async function verificarConectividadSMTP() {
    log('\n🔍 VERIFICANDO CONECTIVIDAD SMTP...', 'bold');
    
    const configs = {
        noreply: {
            host: process.env.SMTP_HOST || 'smtp.privateemail.com',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || 'noreply@grow5x.app',
                pass: process.env.SMTP_PASS || '300400Jd14'
            }
        },
        welcome: {
            host: process.env.WELCOME_EMAIL_HOST || 'smtp.privateemail.com',
            port: process.env.WELCOME_EMAIL_PORT || 587,
            secure: process.env.WELCOME_EMAIL_SECURE === 'true',
            auth: {
                user: process.env.WELCOME_EMAIL_USER || 'welcome@grow5x.app',
                pass: process.env.WELCOME_EMAIL_PASS || '300400Jd14'
            }
        },
        recovery: {
            host: process.env.RECOVERY_EMAIL_HOST || 'smtp.privateemail.com',
            port: process.env.RECOVERY_EMAIL_PORT || 587,
            secure: process.env.RECOVERY_EMAIL_SECURE === 'true',
            auth: {
                user: process.env.RECOVERY_EMAIL_USER || 'recovery@grow5x.app',
                pass: process.env.RECOVERY_EMAIL_PASS || '300400Jd14'
            }
        },
        support: {
            host: process.env.BACKUP_EMAIL_HOST || 'smtp.privateemail.com',
            port: process.env.BACKUP_EMAIL_PORT || 587,
            secure: process.env.BACKUP_EMAIL_SECURE === 'true',
            auth: {
                user: process.env.BACKUP_EMAIL_USER || 'support@grow5x.app',
                pass: process.env.BACKUP_EMAIL_PASS || '300400Jd14'
            }
        }
    };
    
    let allConnected = true;
    
    for (const [name, config] of Object.entries(configs)) {
        try {
            const transporter = nodemailer.createTransport(config);
            await transporter.verify();
            logStatus(`SMTP ${name}@${DOMAIN}`, true, `Conectado a ${config.host}:${config.port}`);
        } catch (error) {
            logStatus(`SMTP ${name}@${DOMAIN}`, false, `Error: ${error.message}`);
            allConnected = false;
        }
    }
    
    return allConnected;
}

async function enviarEmailPrueba() {
    log('\n📧 ENVIANDO EMAIL DE PRUEBA...', 'bold');
    
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.privateemail.com',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || 'noreply@grow5x.app',
                pass: process.env.SMTP_PASS || '300400Jd14'
            }
        });
        
        const mailOptions = {
            from: 'noreply@grow5x.app',
            to: 'noreply@grow5x.app', // Enviar a sí mismo
            subject: '✅ Prueba de Configuración DNS - Grow5x',
            html: `
                <h2>🎉 ¡Configuración DNS Exitosa!</h2>
                <p>Este email confirma que la configuración DNS está funcionando correctamente.</p>
                <ul>
                    <li>✅ Registros MX configurados</li>
                    <li>✅ Registro SPF configurado</li>
                    <li>✅ Registro DKIM configurado</li>
                    <li>✅ Conectividad SMTP verificada</li>
                </ul>
                <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Dominio:</strong> ${DOMAIN}</p>
            `
        };
        
        const result = await transporter.sendMail(mailOptions);
        logStatus('Envío de email', true, `Message ID: ${result.messageId}`);
        return true;
    } catch (error) {
        logStatus('Envío de email', false, `Error: ${error.message}`);
        return false;
    }
}

async function verificarConfiguracionCompleta() {
    log('🚀 INICIANDO VERIFICACIÓN COMPLETA DE CONFIGURACIÓN', 'bold');
    log('='.repeat(60), 'blue');
    
    const resultados = {
        mx: await verificarRegistrosMX(),
        spf: await verificarRegistroSPF(),
        dkim: await verificarRegistroDKIM(),
        smtp: await verificarConectividadSMTP(),
        email: false
    };
    
    // Solo intentar enviar email si todo lo demás está bien
    if (resultados.mx && resultados.spf && resultados.dkim && resultados.smtp) {
        resultados.email = await enviarEmailPrueba();
    } else {
        log('\n📧 OMITIENDO PRUEBA DE EMAIL...', 'yellow');
        log('   Configuración DNS incompleta', 'yellow');
    }
    
    // Resumen final
    log('\n📊 RESUMEN DE VERIFICACIÓN', 'bold');
    log('='.repeat(60), 'blue');
    
    const checks = [
        ['Registros MX', resultados.mx],
        ['Registro SPF', resultados.spf],
        ['Registro DKIM', resultados.dkim],
        ['Conectividad SMTP', resultados.smtp],
        ['Envío de Email', resultados.email]
    ];
    
    checks.forEach(([check, status]) => {
        logStatus(check, status);
    });
    
    const allPassed = Object.values(resultados).every(r => r === true);
    
    log('\n' + '='.repeat(60), 'blue');
    if (allPassed) {
        log('🎉 ¡CONFIGURACIÓN COMPLETA Y FUNCIONAL!', 'green');
        log('✅ Todos los sistemas están operativos', 'green');
        log('✅ Los emails se enviarán correctamente', 'green');
    } else {
        log('⚠️  CONFIGURACIÓN INCOMPLETA', 'yellow');
        log('❌ Algunos componentes necesitan atención', 'red');
        
        if (!resultados.mx || !resultados.spf || !resultados.dkim) {
            log('\n📋 ACCIONES REQUERIDAS:', 'bold');
            if (!resultados.mx) log('   • Configurar registros MX en deSEC', 'yellow');
            if (!resultados.spf) log('   • Configurar registro SPF en deSEC', 'yellow');
            if (!resultados.dkim) log('   • Generar y configurar registro DKIM', 'yellow');
            log('\n📖 Consultar: configurar-dns-desec.md', 'blue');
            log('📖 Consultar: generar-dkim-namecheap.md', 'blue');
        }
    }
    
    return allPassed;
}

// Ejecutar verificación
if (require.main === module) {
    verificarConfiguracionCompleta()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            log(`\n💥 ERROR CRÍTICO: ${error.message}`, 'red');
            process.exit(1);
        });
}

module.exports = {
    verificarConfiguracionCompleta,
    verificarRegistrosMX,
    verificarRegistroSPF,
    verificarRegistroDKIM,
    verificarConectividadSMTP,
    enviarEmailPrueba
};