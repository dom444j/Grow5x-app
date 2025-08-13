# Configuración de Namecheap Private Email para Grow5X

## 🚨 Problema Identificado

Las pruebas muestran que las conexiones SMTP funcionan correctamente, pero los emails son rechazados con el error:
```
554 5.7.1 <email@grow5x.app>: Sender address rejected: Access denied
```

Esto indica que las cuentas de email necesitan ser **creadas y verificadas** en el panel de Namecheap Private Email.

## 📋 Cuentas de Email Requeridas

Según la configuración actual del sistema, necesitas crear estas 4 cuentas en Namecheap:

1. **noreply@grow5x.app** - Para notificaciones del sistema
2. **welcome@grow5x.app** - Para emails de bienvenida
3. **recovery@grow5x.app** - Para recuperación de contraseñas
4. **support@grow5x.app** - Para soporte y respaldo

**Contraseña para todas:** `300400Jd14`

## 🔧 Pasos para Configurar en Namecheap

### 1. Acceder al Panel de Private Email

1. Ve a: https://ap.www.namecheap.com/domains/dcp/privateemail/3638650/grow5x.app
2. Inicia sesión con las credenciales:
   - **Usuario:** grow5x
   - **Contraseña:** POFsSeGyCasw9D9

### 2. Crear las Cuentas de Email

Para cada una de las 4 cuentas:

1. **Busca la opción "Add Mailbox" o "Crear Buzón"**
2. **Crea cada cuenta:**
   - Email: `noreply@grow5x.app`
   - Contraseña: `300400Jd14`
   - Repetir para: `welcome`, `recovery`, `support`

3. **Verificar que cada cuenta esté activa**

### 3. Configurar Opciones SMTP

1. **Habilitar SMTP para cada cuenta**
2. **Verificar configuración:**
   - Servidor SMTP: `smtp.privateemail.com`
   - Puerto: `587`
   - Seguridad: `STARTTLS`
   - Autenticación: `Requerida`

### 4. Verificar Configuración DNS

Asegúrate de que estos registros DNS estén configurados para `grow5x.app`:

```
# Registros MX
grow5x.app.    MX    10    mx1.privateemail.com.
grow5x.app.    MX    10    mx2.privateemail.com.

# Registros SPF
grow5x.app.    TXT   "v=spf1 include:spf.privateemail.com ~all"

# Registro DMARC
_dmarc.grow5x.app.    TXT   "v=DMARC1; p=none; rua=mailto:dmarc@grow5x.app"
```

## 🧪 Verificar Configuración

Después de crear las cuentas, ejecuta:

```bash
# Probar conexiones SMTP
node test-namecheap-email.js

# Probar envío real
node test-support-email.js tu@email.com
```

## 📧 Configuración Actual del Sistema

### Archivo .env (Desarrollo)
```env
# SMTP Principal
SMTP_HOST=smtp.privateemail.com
SMTP_PORT=587
SMTP_USER=noreply@grow5x.app
SMTP_PASS=300400Jd14

# Email de Bienvenida
WELCOME_EMAIL_HOST=smtp.privateemail.com
WELCOME_EMAIL_USER=welcome@grow5x.app
WELCOME_EMAIL_PASS=300400Jd14

# Email de Recuperación
RECOVERY_EMAIL_HOST=smtp.privateemail.com
RECOVERY_EMAIL_USER=recovery@grow5x.app
RECOVERY_EMAIL_PASS=300400Jd14

# Email de Soporte
BACKUP_EMAIL_HOST=smtp.privateemail.com
BACKUP_EMAIL_USER=support@grow5x.app
BACKUP_EMAIL_PASS=300400Jd14
```

### Archivo .env.production (Producción)
✅ **Ya actualizado** con las credenciales de Namecheap Private Email

### ecosystem.config.js (PM2)
✅ **Ya actualizado** con las configuraciones de respaldo

## 🔍 Diagnóstico de Problemas

### Error: "Sender address rejected: Access denied"
**Causa:** La cuenta de email no existe o no está habilitada en Namecheap
**Solución:** Crear la cuenta en el panel de Namecheap Private Email

### Error: "Authentication failed"
**Causa:** Contraseña incorrecta o cuenta no configurada
**Solución:** Verificar contraseña `300400Jd14` y que la cuenta esté activa

### Error: "Connection timeout"
**Causa:** Problemas de conectividad o firewall
**Solución:** Verificar conexión a internet y configuración de firewall

## 📝 Checklist de Configuración

- [ ] Acceder al panel de Namecheap Private Email
- [ ] Crear cuenta `noreply@grow5x.app` con contraseña `300400Jd14`
- [ ] Crear cuenta `welcome@grow5x.app` con contraseña `300400Jd14`
- [ ] Crear cuenta `recovery@grow5x.app` con contraseña `300400Jd14`
- [ ] Crear cuenta `support@grow5x.app` con contraseña `300400Jd14`
- [ ] Habilitar SMTP para todas las cuentas
- [ ] Verificar registros DNS (MX, SPF, DMARC)
- [ ] Probar conexiones SMTP con `node test-namecheap-email.js`
- [ ] Probar envío real con `node test-support-email.js`
- [ ] Verificar que los emails no vayan a spam

## 🚀 Próximos Pasos

1. **Crear las cuentas en Namecheap** siguiendo los pasos arriba
2. **Probar la configuración** con los scripts proporcionados
3. **Verificar el sistema de verificación** registrando un usuario de prueba
4. **Configurar DNS adicional** si es necesario para evitar spam

## 📞 Soporte

Si tienes problemas:
1. Verifica que tengas acceso al panel de Namecheap
2. Contacta al soporte de Namecheap si no puedes crear las cuentas
3. Ejecuta los scripts de prueba después de cada cambio

---

**Nota:** Una vez que las cuentas estén creadas y funcionando, el sistema de verificación de usuarios por email funcionará automáticamente.