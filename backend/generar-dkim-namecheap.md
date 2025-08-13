# GENERAR REGISTRO DKIM EN NAMECHEAP PRIVATE EMAIL

## 🎯 OBJETIVO
Generar el registro DKIM necesario desde el panel de Namecheap Private Email para completar la configuración DNS.

## 📋 CREDENCIALES NAMECHEAP
- **Panel**: https://www.namecheap.com/
- **Usuario**: [Credenciales proporcionadas por el usuario]
- **Private Email**: https://privateemail.com/

## 🔐 PASOS PARA GENERAR DKIM

### MÉTODO 1: Desde Panel de Namecheap

1. **Acceder a Namecheap**
   - Ir a: https://www.namecheap.com/
   - Iniciar sesión con las credenciales

2. **Navegar a Private Email**
   - Dashboard → Products → Private Email
   - Seleccionar el plan de grow5x.app

3. **Acceder a Configuración de Dominio**
   - Buscar "Domain Settings" o "Configuración de Dominio"
   - Seleccionar grow5x.app

4. **Generar DKIM**
   - Buscar sección "DKIM" o "DomainKeys"
   - Hacer clic en "Generate DKIM" o "Generar DKIM"
   - Copiar el valor generado (será muy largo)

### MÉTODO 2: Desde Webmail de Private Email

1. **Acceder al Webmail**
   - Ir a: https://privateemail.com/
   - Iniciar sesión con una de las cuentas creadas:
     - noreply@grow5x.app / 300400Jd14
     - welcome@grow5x.app / 300400Jd14
     - recovery@grow5x.app / 300400Jd14
     - support@grow5x.app / 300400Jd14

2. **Navegar a Configuración**
   - Buscar "Settings" o "Configuración"
   - Ir a "Domain Settings" o "Configuración de Dominio"

3. **Generar DKIM**
   - Buscar "DKIM Settings"
   - Generar registro para grow5x.app
   - Copiar el valor completo

## 📝 FORMATO DEL REGISTRO DKIM

El registro DKIM tendrá este formato:

**Tipo**: TXT
**Host/Subname**: `default._domainkey`
**Valor**: `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...` (muy largo)

## 🔧 CONFIGURAR EN deSEC

Una vez obtenido el valor DKIM:

1. **Ir al panel de deSEC**
   - https://desec.io/domains/grow5x.app
   - Iniciar sesión: growx04@gmail.com / 300400Jd14@

2. **Agregar registro DKIM**
   - Tipo: `TXT`
   - Subname: `default._domainkey`
   - Content: `[VALOR DKIM COMPLETO DESDE NAMECHEAP]`
   - TTL: `3600`
   - Guardar

## 🧪 VERIFICACIÓN

Después de configurar el DKIM:

```bash
# Verificar registro DKIM
nslookup -type=TXT default._domainkey.grow5x.app

# Script automatizado
node verify-dns-setup.js

# Probar envío (después de propagación)
node test-namecheap-email.js
```

## 🚨 NOTAS IMPORTANTES

1. **Valor muy largo**: El registro DKIM es extremadamente largo (500+ caracteres)
2. **Copiar completo**: Asegurarse de copiar todo el valor sin espacios extra
3. **Propagación**: Esperar 30-60 minutos después de configurar
4. **Obligatorio**: Sin DKIM los emails irán a spam o serán rechazados
5. **Una sola vez**: Solo necesita generarse una vez por dominio

## 🔄 ORDEN DE CONFIGURACIÓN COMPLETA

1. ✅ **Registros MX** (mx1 y mx2.privateemail.com)
2. ✅ **Registro SPF** (v=spf1 include:spf.privateemail.com ~all)
3. 🔄 **Registro DKIM** (este paso)
4. ⏱️ **Esperar propagación** (30-60 minutos)
5. 🧪 **Verificar y probar**

## 📞 SOPORTE

Si hay problemas generando el DKIM:
- **Namecheap Support**: https://www.namecheap.com/support/
- **Private Email Help**: https://www.namecheap.com/support/knowledgebase/subcategory/2176/private-email/
- **Chat en vivo**: Disponible 24/7 en el panel de Namecheap

**Una vez configurado el DKIM, la configuración DNS estará completa y los emails funcionarán correctamente.**