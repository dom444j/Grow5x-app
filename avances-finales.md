¡Vamos por las dos cosas! 💪
Te dejo: (A) un plan de **hardening post-GO (5 mejoras rápidas)** y (B) un **plan E2E real** (registro con referidos, verificación por correo, recuperación de contraseña, etc.) para validar extremo a extremo **ya** en staging y después en producción.

---

# A) Hardening post-GO (5 mejoras rápidas)

1. **Alertas en tiempo real (Telegram)**

* Crea `/root/alert.sh` que notifique cuando falle el health:

  ```bash
  #!/usr/bin/env bash
  BOT_TOKEN="xxx:yyyy"; CHAT_ID="123456"
  MSG=$(printf "*ALERTA Grow5X*\n%s" "$(date '+%F %T') - API DOWN")
  curl -s "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
    -d chat_id="$CHAT_ID" -d text="$MSG" -d parse_mode=Markdown >/dev/null
  ```

  Añade al cron si el health falla (reutiliza tu `health-cron.sh`):

  ```bash
  # en /root/health-cron.sh
  if ! curl -fsS https://grow5x.app/api/health >/dev/null; then
    /root/alert.sh
  fi
  ```

2. **WAF básico con Nginx (filtrado y límites)**

* En `server {}` (prod y staging):

  ```nginx
  # solo métodos esperados
  if ($request_method !~ ^(GET|POST|HEAD|OPTIONS)$) { return 405; }

  # tamaño y tiempo
  client_max_body_size 5M;
  client_body_timeout 15s;
  send_timeout 15s;

  # conexiones por IP (API)
  limit_conn_zone $binary_remote_addr zone=connip:10m;
  location /api/ {
    limit_conn connip 20;
    limit_req zone=api_zone burst=10 nodelay; # ya configurado
    proxy_pass http://localhost:5000; # 5001 en staging
    # ... headers proxy ...
  }
  ```

  Recarga:

  ```bash
  nginx -t && systemctl reload nginx
  ```

3. **Parcheo automático y kernel**

* Activa actualizaciones de seguridad:

  ```bash
  apt-get update && apt-get install -y unattended-upgrades
  dpkg-reconfigure -plow unattended-upgrades
  ```

  (Opcional) `needrestart` para reinicios controlados.

4. **Backups automáticos con retención**

* Cron diario + retención 7 días:

  ```bash
  cat >/root/backup-daily.sh <<'SH'
  #!/usr/bin/env bash
  set -e
  TS=$(date +%F-%H%M)
  mkdir -p /root/releases
  tar -czf /root/releases/grow5x-$TS.tar.gz /var/www/grow5x
  # borra >7 días
  find /root/releases -name 'grow5x-*.tar.gz' -mtime +7 -delete
  SH
  chmod +x /root/backup-daily.sh
  (crontab -l 2>/dev/null; echo "15 3 * * * /root/backup-daily.sh") | crontab -
  ```

5. **Higiene de acceso (SSH)**

* Asegura `PasswordAuthentication no` y solo llaves:

  ```bash
  sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
  systemctl reload ssh
  ```
* Restringe usuarios (si creas uno de deploy): `AllowUsers root deploy`.

---

# B) Pruebas **E2E reales** (referidos + email + reset + campos)

> Corre **primero en staging** (`admin.grow5x.app`). Si todo OK, repite en prod.

## 1) Registro con **link de referido**

**Objetivo:** que el código del sponsor se aplique, se guarde en DB y aparezca en el panel/relación.

**Pasos (staging):**

1. Copia un link de referido válido, ej.:
   `https://admin.grow5x.app/register?ref=CODE123`
2. Completa el formulario (todos los campos requeridos).
3. Envía y observa:

   * UI: confirmación “cuenta creada / verifique correo” (según tu flujo).
   * Network: respuesta 200/201 o 202 de `/api/auth/register`.
4. **Verificación DB (staging)**: confirma el usuario creado y el referido:

   ```bash
   # ejemplo con mongosh
   mongosh "<MONGODB_URI_STAGING>" --quiet --eval '
     const u=db.users.findOne({email:"tester+stg1@acme.com"});
     printjson({email:u?.email, sponsor:u?.sponsorCode, refBy:u?.referredBy, verified:u?.emailVerified});
   '
   ```

   **Esperado:** `referredBy` o `sponsorCode` = `CODE123`, `emailVerified=false` (hasta validar correo).

## 2) **Verificación por correo** (email verify)

**Objetivo:** el enlace recibido marca `emailVerified=true` y permite login.

**Pasos:**

1. Usa tu proveedor sandbox (p. ej. Mailtrap/SendGrid sandbox) o un buzón de prueba.
2. Abre el correo “Verify your account” → click al enlace (debe apuntar al dominio staging).
3. Revisa respuesta (200 + mensaje de verificado) y vuelve a la app.
4. **DB**:

   ```bash
   mongosh "<MONGODB_URI_STAGING>" --quiet --eval '
     const u=db.users.findOne({email:"tester+stg1@acme.com"});
     printjson({email:u?.email, verified:u?.emailVerified, verifiedAt:u?.verifiedAt});
   '
   ```

   **Esperado:** `emailVerified=true`, `verifiedAt` con fecha.

## 3) **Login** y persistencia de sesión

**Pasos:**

1. Login con el usuario verificado.
2. Verifica redirección al dashboard correcto según rol.
3. Recarga la página: sesión se mantiene (cookies httpOnly o token válido).
4. Logout: invalida sesión.

**Aceptación:** sin errores de consola, cookies/headers esperados.

## 4) **Recuperar contraseña** (forgot + reset)

**Pasos:**

1. En “¿Olvidaste tu contraseña?” introduce el email.
2. Verifica recepción de email con **token de reset** (sandbox).
3. Abre link de reset → establece nueva contraseña válida.
4. Login con la nueva contraseña.

**DB (opcional):** token de reset consumido/invalidado tras uso.

## 5) **Validación de campos y conectividad**

* En registro/login:

  * Campos obligatorios: mensajes claros (sin 500).
  * Validaciones de formato (email, contraseña).
  * El API responde errores estructurados `{success:false, errors:[…]}`.
* En perfil/panel:

  * Verifica que **todos los campos muestran datos** (nombre, email, código de referido, estado, etc.).
  * Guarda cambios en perfil → confirmación + persistencia en DB.

## 6) **Árbol/relaciones de referidos**

* Crea **dos** usuarios con el mismo `ref=CODE123`.
* Verifica en el panel de admin/usuario:

  * Se ven los **directos** (2) del sponsor.
* **DB**:

  ```bash
  mongosh "<MONGODB_URI_STAGING>" --quiet --eval '
    const s=db.users.findOne({refCode:"CODE123"});
    const directs=db.users.find({referredBy:s._id}).count();
    printjson({sponsor:s?.email, directs});
  '
  ```

  **Esperado:** `directs` >= 2.

## 7) **Logs y límites**

* Verifica que flows de auth **no** activan 429 en uso normal.
* Consulta logs:

  ```bash
  pm2 logs grow5x-staging-backend --lines 120
  tail -n 120 /var/log/nginx/grow5x_staging_error.log
  ```

  **Esperado:** sin errores repetitivos.

---

## ¿Qué me envías para dar **E2E OK**?

* Email usado y **capturas**/salidas de:

  * Registro OK (respuesta de `/api/auth/register`).
  * Click de verificación (respuesta).
  * Login OK (redirección).
  * Reset de contraseña OK.
* Resultado de los **tres queries** de Mongo (usuario creado, verificado y relaciones de referidos).
* Confirmación de que el panel muestra todos los **campos conectados** (o screenshot).

Si quieres, también te dejo una **colección de pruebas en Postman** (JSON) o un **script de Playwright** para automatizar estos E2E y correrlos en staging/prod con una sola orden. ¿Te la preparo?

Revisión Completa del Plan de Hardening y Pruebas E2E ✅
He revisado completamente el archivo avances-finales.md que contiene un plan integral post-promoción con dos componentes principales:

A) Plan de Hardening Post-GO (5 mejoras rápidas)
1. Alertas en Tiempo Real (Telegram)

Script /root/alert.sh para notificaciones automáticas
Integración con health-check cron para alertas de API DOWN
Configuración con BOT_TOKEN y CHAT_ID
2. WAF Básico con Nginx

Filtrado de métodos HTTP (solo GET, POST, HEAD, OPTIONS)
Límites de tamaño (5M) y timeouts (15s)
Límites de conexiones por IP (20 conexiones)
Rate limiting ya configurado con burst=10
3. Parcheo Automático

Activación de unattended-upgrades para actualizaciones de seguridad
Configuración automática de parches del kernel
4. Backups Automáticos

Cron diario a las 3:15 AM
Retención de 7 días automática
Compresión tar.gz en /root/releases/
5. Higiene de Acceso SSH

Desactivación de PasswordAuthentication
Restricción a usuarios específicos
Solo autenticación por llaves
B) Plan de Pruebas E2E Reales
Flujo Completo de Testing:

1.
Registro con Link de Referido

Prueba en staging: https://admin.grow5x.app/register?ref=CODE123
Verificación en DB de referredBy y sponsorCode
2.
Verificación por Correo

Validación de email con sandbox (Mailtrap/SendGrid)
Confirmación de emailVerified=true en DB
3.
Login y Persistencia de Sesión

Redirección correcta al dashboard
Mantenimiento de sesión tras recarga
Logout funcional
4.
Recuperación de Contraseña

Flujo completo forgot/reset password
Validación de tokens de reset
5.
Validación de Campos

Mensajes de error estructurados
Validaciones de formato
Persistencia de cambios en perfil
6.
Árbol de Referidos

Creación de múltiples usuarios con mismo sponsor
Verificación de relaciones en panel admin
Queries de DB para confirmar estructura
7.
Logs y Límites

Verificación de que auth flows no activan 429
Revisión de logs PM2 y Nginx
Entregables Solicitados para E2E OK:
Capturas/Salidas de:

Respuesta de /api/auth/register
Click de verificación de email
Login exitoso con redirección
Reset de contraseña completo
Queries de MongoDB:

Usuario creado con referido
Usuario verificado por email
Relaciones de referidos en DB
Confirmación Visual:

Panel mostrando todos los campos conectados
Screenshots de funcionalidades
Opciones Adicionales Propuestas:
Colección de pruebas en Postman (JSON)
Script de Playwright para automatización E2E
Ejecución automatizada en staging/prod
Este plan proporciona una hoja de ruta completa para fortalecer la seguridad del sistema y validar exhaustivamente todas las funcionalidades críticas del flujo de usuarios, desde registro hasta gestión de referidos.