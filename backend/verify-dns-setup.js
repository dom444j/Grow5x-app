#!/usr/bin/env node

/**
 * Script de Verificación DNS para Namecheap Private Email
 * Verifica el estado actual de los registros DNS y proporciona instrucciones
 * para configurar correctamente en deSEC
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const DOMAIN = 'grow5x.app';
const REQUIRED_MX_RECORDS = [
    'mx1.privateemail.com',
    'mx2.privateemail.com'
];
const REQUIRED_SPF = 'v=spf1 include:spf.privateemail.com ~all';

class DNSVerifier {
    constructor() {
        this.results = {
            nameservers: [],
            mxRecords: [],
            txtRecords: [],
            spfRecord: null,
            dkimRecord: null,
            status: 'checking'
        };
    }

    async checkNameservers() {
        console.log('🔍 Verificando nameservers...');
        try {
            const { stdout } = await execAsync(`nslookup -type=NS ${DOMAIN}`);
            const lines = stdout.split('\n');
            const nsLines = lines.filter(line => line.includes('nameserver'));
            
            this.results.nameservers = nsLines.map(line => {
                const match = line.match(/nameserver = (.+)/);
                return match ? match[1].trim() : null;
            }).filter(Boolean);

            console.log('✅ Nameservers encontrados:');
            this.results.nameservers.forEach(ns => console.log(`   - ${ns}`));
            
            return this.results.nameservers;
        } catch (error) {
            console.error('❌ Error verificando nameservers:', error.message);
            return [];
        }
    }

    async checkMXRecords() {
        console.log('\n🔍 Verificando registros MX...');
        try {
            const { stdout } = await execAsync(`nslookup -type=MX ${DOMAIN}`);
            const lines = stdout.split('\n');
            const mxLines = lines.filter(line => line.includes('mail exchanger'));
            
            this.results.mxRecords = mxLines.map(line => {
                const match = line.match(/mail exchanger = (\d+) (.+)/);
                return match ? { priority: parseInt(match[1]), server: match[2].trim() } : null;
            }).filter(Boolean);

            if (this.results.mxRecords.length > 0) {
                console.log('✅ Registros MX encontrados:');
                this.results.mxRecords.forEach(mx => {
                    console.log(`   - Prioridad ${mx.priority}: ${mx.server}`);
                });
            } else {
                console.log('❌ No se encontraron registros MX');
            }
            
            return this.results.mxRecords;
        } catch (error) {
            console.error('❌ Error verificando registros MX:', error.message);
            return [];
        }
    }

    async checkTXTRecords() {
        console.log('\n🔍 Verificando registros TXT (SPF/DKIM)...');
        try {
            const { stdout } = await execAsync(`nslookup -type=TXT ${DOMAIN}`);
            const lines = stdout.split('\n');
            const txtLines = lines.filter(line => line.includes('text ='));
            
            this.results.txtRecords = txtLines.map(line => {
                const match = line.match(/text = "(.+)"/);
                return match ? match[1].trim() : null;
            }).filter(Boolean);

            // Buscar registro SPF
            this.results.spfRecord = this.results.txtRecords.find(record => 
                record.startsWith('v=spf1')
            );

            // Buscar registro DKIM
            try {
                const { stdout: dkimStdout } = await execAsync(`nslookup -type=TXT default._domainkey.${DOMAIN}`);
                const dkimLines = dkimStdout.split('\n');
                const dkimTxtLines = dkimLines.filter(line => line.includes('text ='));
                if (dkimTxtLines.length > 0) {
                    const match = dkimTxtLines[0].match(/text = "(.+)"/);
                    this.results.dkimRecord = match ? match[1].trim() : null;
                }
            } catch (dkimError) {
                // DKIM no encontrado, es normal si no está configurado
            }

            if (this.results.spfRecord) {
                console.log('✅ Registro SPF encontrado:');
                console.log(`   - ${this.results.spfRecord}`);
            } else {
                console.log('❌ No se encontró registro SPF');
            }

            if (this.results.dkimRecord) {
                console.log('✅ Registro DKIM encontrado:');
                console.log(`   - ${this.results.dkimRecord.substring(0, 50)}...`);
            } else {
                console.log('❌ No se encontró registro DKIM');
            }
            
            return this.results.txtRecords;
        } catch (error) {
            console.error('❌ Error verificando registros TXT:', error.message);
            return [];
        }
    }

    analyzeResults() {
        console.log('\n📊 ANÁLISIS DE RESULTADOS\n');
        
        // Verificar nameservers
        const isDesecNameservers = this.results.nameservers.some(ns => 
            ns.includes('desec.io') || ns.includes('desec.org')
        );
        
        if (isDesecNameservers) {
            console.log('✅ Nameservers: deSEC detectado');
            console.log('   → Los registros DNS deben configurarse en https://desec.io/');
        } else {
            console.log('⚠️  Nameservers: No es deSEC');
            console.log('   → Verificar dónde configurar los registros DNS');
        }

        // Verificar registros MX
        const hasCorrectMX = REQUIRED_MX_RECORDS.every(requiredMx => 
            this.results.mxRecords.some(mx => mx.server === requiredMx)
        );
        
        if (hasCorrectMX) {
            console.log('✅ Registros MX: Configurados correctamente');
        } else {
            console.log('❌ Registros MX: Faltantes o incorrectos');
            console.log('   → Deben configurarse:');
            REQUIRED_MX_RECORDS.forEach(mx => {
                console.log(`     - ${mx} (prioridad 10)`);
            });
        }

        // Verificar SPF
        const hasCorrectSPF = this.results.spfRecord && 
            this.results.spfRecord.includes('include:spf.privateemail.com');
        
        if (hasCorrectSPF) {
            console.log('✅ Registro SPF: Configurado correctamente');
        } else {
            console.log('❌ Registro SPF: Faltante o incorrecto');
            console.log(`   → Debe configurarse: ${REQUIRED_SPF}`);
        }

        // Verificar DKIM
        if (this.results.dkimRecord) {
            console.log('✅ Registro DKIM: Configurado');
        } else {
            console.log('❌ Registro DKIM: Faltante');
            console.log('   → Debe generarse desde el panel de Namecheap Private Email');
        }

        return {
            nameserversOk: isDesecNameservers,
            mxRecordsOk: hasCorrectMX,
            spfRecordOk: hasCorrectSPF,
            dkimRecordOk: !!this.results.dkimRecord
        };
    }

    generateInstructions(analysis) {
        console.log('\n📋 INSTRUCCIONES DE CONFIGURACIÓN\n');
        
        if (analysis.nameserversOk) {
            console.log('🎯 CONFIGURACIÓN EN deSEC (https://desec.io/)\n');
            
            if (!analysis.mxRecordsOk) {
                console.log('1. 📧 CONFIGURAR REGISTROS MX:');
                console.log('   Tipo: MX');
                console.log('   Host: @');
                console.log('   Valor: mx1.privateemail.com');
                console.log('   Prioridad: 10');
                console.log('   TTL: 3600\n');
                
                console.log('   Tipo: MX');
                console.log('   Host: @');
                console.log('   Valor: mx2.privateemail.com');
                console.log('   Prioridad: 10');
                console.log('   TTL: 3600\n');
            }
            
            if (!analysis.spfRecordOk) {
                console.log('2. 🛡️  CONFIGURAR REGISTRO SPF:');
                console.log('   Tipo: TXT');
                console.log('   Host: @');
                console.log(`   Valor: ${REQUIRED_SPF}`);
                console.log('   TTL: 3600\n');
            }
            
            if (!analysis.dkimRecordOk) {
                console.log('3. 🔐 CONFIGURAR REGISTRO DKIM:');
                console.log('   a) Ir al panel de Namecheap Private Email');
                console.log('   b) Generar registro DKIM para grow5x.app');
                console.log('   c) Copiar el valor generado');
                console.log('   d) Agregar en deSEC:');
                console.log('      Tipo: TXT');
                console.log('      Host: default._domainkey');
                console.log('      Valor: [valor generado desde Namecheap]');
                console.log('      TTL: 3600\n');
            }
            
            console.log('4. ⏱️  ESPERAR PROPAGACIÓN:');
            console.log('   - Tiempo estimado: 30-60 minutos');
            console.log('   - Verificar con: node verify-dns-setup.js');
            console.log('   - Probar envío con: node test-namecheap-email.js\n');
        } else {
            console.log('⚠️  Los nameservers no son de deSEC.');
            console.log('   Contactar al administrador del dominio para configurar DNS.\n');
        }
    }

    async run() {
        console.log('🚀 VERIFICADOR DNS PARA NAMECHEAP PRIVATE EMAIL\n');
        console.log(`📧 Dominio: ${DOMAIN}\n`);
        
        await this.checkNameservers();
        await this.checkMXRecords();
        await this.checkTXTRecords();
        
        const analysis = this.analyzeResults();
        this.generateInstructions(analysis);
        
        // Resumen final
        console.log('📈 RESUMEN FINAL:');
        const allConfigured = Object.values(analysis).every(Boolean);
        
        if (allConfigured) {
            console.log('✅ Configuración DNS completa - Los emails deberían funcionar');
            console.log('🧪 Ejecutar: node test-namecheap-email.js');
        } else {
            console.log('❌ Configuración DNS incompleta - Los emails fallarán');
            console.log('🔧 Seguir las instrucciones de configuración arriba');
        }
        
        console.log('\n📚 Documentación completa: CONFIGURACION-DNS-DESEC.md');
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verifier = new DNSVerifier();
    verifier.run().catch(error => {
        console.error('❌ Error ejecutando verificación:', error);
        process.exit(1);
    });
}

module.exports = DNSVerifier;