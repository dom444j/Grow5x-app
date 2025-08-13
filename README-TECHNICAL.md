# Grow5X - Documentación Técnica Completa

## 📋 Índice

1. [Comandos de Despliegue](#comandos-de-despliegue)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Testing](#testing)
4. [Backup y Restauración](#backup-y-restauración)
5. [Monitoreo y Logs](#monitoreo-y-logs)
6. [Mantenimiento](#mantenimiento)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Comandos de Despliegue

### Configuración Inicial del VPS

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias
sudo apt install -y nodejs npm nginx mongodb git

# 3. Instalar PM2 globalmente
sudo npm install -g pm2

# 4. Configurar PM2 logrotate
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss

# 5. Clonar repositorio
git clone <repository-url> /var/www/growx5
cd /var/www/growx5

# 6. Configurar permisos
sudo chown -R $USER:$USER /var/www/growx5
sudo chmod -R 755 /var/www/growx5
```

### Despliegue Backend

```bash
# 1. Navegar al directorio backend
cd /var/www/growx5/backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
nano .env  # Configurar variables

# 4. Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 5. Verificar estado
pm2 status
pm2 logs growx5-backend
```

### Despliegue Frontend

```bash
# 1. Navegar al directorio frontend
cd /var/www/growx5/frontend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
nano .env  # Configurar VITE_API_URL

# 4. Construir para producción
npm run build

# 5. Configurar Nginx
sudo cp nginx.conf /etc/nginx/sites-available/growx5
sudo ln -s /etc/nginx/sites-available/growx5 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Actualización del Sistema

```bash
# 1. Backup antes de actualizar
/usr/local/bin/backup-project.sh

# 2. Actualizar código
cd /var/www/growx5
git pull origin main

# 3. Actualizar backend
cd backend
npm install
pm2 reload growx5-backend

# 4. Actualizar frontend
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx

# 5. Verificar servicios
pm2 status
sudo systemctl status nginx
curl -I https://grow5x.app
```

---

## 📁 Estructura del Proyecto

```
growx5-app/
├── backend/                    # API Backend (Node.js + Express)
│   ├── src/
│   │   ├── controllers/        # Controladores de rutas
│   │   ├── models/            # Modelos de MongoDB
│   │   ├── middleware/        # Middleware personalizado
│   │   ├── routes/            # Definición de rutas
│   │   ├── utils/             # Utilidades y helpers
│   │   └── config/            # Configuraciones
│   ├── tests/                 # Tests unitarios
│   │   ├── auth.test.js       # Tests de autenticación
│   │   ├── referrals.test.js  # Tests de sistema de referidos
│   │   └── setup.js           # Configuración de tests
│   ├── scripts/               # Scripts de utilidad
│   ├── ecosystem.config.js    # Configuración PM2
│   ├── jest.config.js         # Configuración Jest
│   ├── server.js              # Punto de entrada
│   └── package.json
│
├── frontend/                   # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── pages/             # Páginas principales
│   │   ├── hooks/             # Custom hooks
│   │   ├── utils/             # Utilidades frontend
│   │   ├── context/           # Context providers
│   │   └── assets/            # Recursos estáticos
│   ├── tests/
│   │   └── e2e/               # Tests End-to-End
│   │       ├── critical-flows.spec.js  # Tests de flujos críticos
│   │       ├── global-setup.js         # Setup global E2E
│   │       └── global-teardown.js      # Cleanup global E2E
│   ├── public/                # Archivos públicos
│   ├── dist/                  # Build de producción
│   ├── playwright.config.js   # Configuración Playwright
│   ├── vite.config.js         # Configuración Vite
│   └── package.json
│
├── docs/                      # Documentación
├── scripts/                   # Scripts de deployment
└── README-TECHNICAL.md        # Esta documentación
```

### Roles de Módulos Principales

#### Backend
- **Controllers**: Lógica de negocio y manejo de requests
- **Models**: Esquemas de base de datos y validaciones
- **Middleware**: Autenticación, validación, rate limiting
- **Routes**: Definición de endpoints API
- **Utils**: Funciones auxiliares, email, crypto

#### Frontend
- **Components**: Componentes reutilizables UI
- **Pages**: Vistas principales de la aplicación
- **Hooks**: Lógica de estado y efectos personalizados
- **Context**: Gestión de estado global
- **Utils**: Helpers, formatters, validaciones

---

## 🧪 Testing

### Tests Backend (Jest + Supertest)

```bash
# Ejecutar todos los tests
npm test

# Tests con coverage
npm run test:coverage

# Tests específicos
npm run test:auth
npm run test:referrals

# Tests en modo watch
npm run test:watch

# Tests silenciosos
npm run test:silent
```

#### Flujos Cubiertos
- ✅ Autenticación de admin
- ✅ Registro de usuarios
- ✅ Sistema de referidos
- ✅ Validación de JWT
- ✅ Consistencia de datos admin/usuario
- ✅ Manejo de errores

### Tests Frontend (Playwright E2E)

```bash
# Instalar navegadores
npm run test:install

# Ejecutar tests E2E
npm run test:e2e

# Tests con interfaz visual
npm run test:e2e:ui

# Tests en modo debug
npm run test:e2e:debug

# Ver reporte de tests
npm run test:e2e:report
```

#### Flujos E2E Cubiertos
- ✅ Login de administrador
- ✅ Registro de usuario nuevo
- ✅ Sistema de referidos completo
- ✅ Navegación y UI responsiva
- ✅ Manejo de errores de red
- ✅ Consistencia de datos entre vistas

### Configuración de Tests

#### Backend (Jest)
- Base de datos en memoria (MongoDB Memory Server)
- Cleanup automático entre tests
- Mocks para servicios externos
- Coverage reports en HTML

#### Frontend (Playwright)
- Tests multi-navegador (Chrome, Firefox, Safari)
- Tests móviles (iOS, Android)
- Screenshots y videos en fallos
- Trazas de ejecución

---

## 💾 Backup y Restauración

### Backup Automático

El sistema incluye scripts automatizados configurados en cron:

```bash
# Ver cron jobs activos
crontab -l

# Backup diario a las 2 AM
0 2 * * * /usr/local/bin/backup-project.sh

# Sincronización de logs cada 6 horas
0 */6 * * * /usr/local/bin/sync-logs.sh
```

### Scripts de Backup

#### `/usr/local/bin/backup-project.sh`
```bash
#!/bin/bash
# Backup completo del proyecto y base de datos
# Retiene 7 días de backups
# Ubicación: /var/backups/project/ y /var/backups/database/
```

#### `/usr/local/bin/sync-logs.sh`
```bash
#!/bin/bash
# Sincronización y rotación de logs
# Retiene 30 días de logs
# Ubicación: /var/backups/logs/
```

### Backup Manual

```bash
# Backup completo manual
sudo /usr/local/bin/backup-project.sh

# Backup solo base de datos
mongodump --db growx5 --out /var/backups/database/manual-$(date +%Y%m%d_%H%M%S)

# Backup solo proyecto
tar -czf /var/backups/project/manual-$(date +%Y%m%d_%H%M%S).tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='logs' \
    -C /var/www growx5
```

### Restauración

#### Restaurar Proyecto
```bash
# 1. Detener servicios
pm2 stop all
sudo systemctl stop nginx

# 2. Backup actual
mv /var/www/growx5 /var/www/growx5.backup.$(date +%Y%m%d_%H%M%S)

# 3. Restaurar desde backup
cd /var/www
tar -xzf /var/backups/project/growx5-YYYYMMDD_HHMMSS.tar.gz

# 4. Restaurar permisos
sudo chown -R $USER:$USER /var/www/growx5
sudo chmod -R 755 /var/www/growx5

# 5. Reinstalar dependencias
cd /var/www/growx5/backend && npm install
cd /var/www/growx5/frontend && npm install && npm run build

# 6. Reiniciar servicios
pm2 start ecosystem.config.js
sudo systemctl start nginx
```

#### Restaurar Base de Datos
```bash
# 1. Backup actual
mongodump --db growx5 --out /var/backups/database/pre-restore-$(date +%Y%m%d_%H%M%S)

# 2. Restaurar desde backup
mongorestore --db growx5 --drop /var/backups/database/growx5-YYYYMMDD_HHMMSS/growx5

# 3. Verificar restauración
mongo growx5 --eval "db.users.count(); db.commissions.count();"
```

---

## 📊 Monitoreo y Logs

### PM2 Logs

```bash
# Ver logs en tiempo real
pm2 logs
pm2 logs growx5-backend

# Ver logs específicos
pm2 logs growx5-backend --lines 100

# Limpiar logs
pm2 flush

# Información de procesos
pm2 info growx5-backend
pm2 monit
```

### Configuración de Logs

#### PM2 Logrotate
- **Tamaño máximo**: 10MB por archivo
- **Retención**: 30 días
- **Compresión**: Habilitada
- **Formato fecha**: YYYY-MM-DD_HH-mm-ss

#### Ubicaciones de Logs
```bash
# PM2 logs
~/.pm2/logs/

# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# Sistema
/var/log/syslog

# Backups de logs
/var/backups/logs/
```

### Monitoreo de Sistema

```bash
# Estado de servicios
sudo systemctl status nginx
sudo systemctl status mongodb
pm2 status

# Uso de recursos
htop
df -h
free -h

# Conexiones de red
ss -tulpn | grep :5000
ss -tulpn | grep :80

# Logs de errores recientes
journalctl -u nginx -f
tail -f /var/log/nginx/error.log
```

---

## 🔧 Mantenimiento

### Tareas Diarias Automatizadas

1. **Backup completo** (2:00 AM)
2. **Sincronización de logs** (cada 6 horas)
3. **Rotación de logs PM2** (automática)
4. **Limpieza de archivos temporales** (incluido en backup)

### Tareas Manuales Semanales

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Verificar espacio en disco
df -h
du -sh /var/backups/*

# 3. Revisar logs de errores
grep -i error /var/log/nginx/error.log | tail -20
pm2 logs growx5-backend | grep -i error | tail -20

# 4. Verificar estado de servicios
sudo systemctl status nginx mongodb
pm2 status

# 5. Limpiar backups antiguos (si es necesario)
find /var/backups -name "*.tar.gz" -mtime +7 -delete
```

### Tareas Manuales Mensuales

```bash
# 1. Actualizar dependencias Node.js
cd /var/www/growx5/backend && npm audit && npm update
cd /var/www/growx5/frontend && npm audit && npm update

# 2. Optimizar base de datos
mongo growx5 --eval "db.runCommand({compact: 'users'})"
mongo growx5 --eval "db.runCommand({compact: 'commissions'})"

# 3. Verificar certificados SSL
sudo certbot certificates

# 4. Revisar métricas de rendimiento
pm2 monit
```

---

## 🚨 Troubleshooting

### Problemas Comunes

#### Backend no responde
```bash
# 1. Verificar estado PM2
pm2 status
pm2 logs growx5-backend

# 2. Verificar puerto
ss -tulpn | grep :5000

# 3. Reiniciar proceso
pm2 restart growx5-backend

# 4. Verificar variables de entorno
cat /var/www/growx5/backend/.env
```

#### Frontend no carga
```bash
# 1. Verificar Nginx
sudo systemctl status nginx
sudo nginx -t

# 2. Verificar archivos dist
ls -la /var/www/growx5/frontend/dist/

# 3. Verificar logs Nginx
tail -f /var/log/nginx/error.log

# 4. Reconstruir frontend
cd /var/www/growx5/frontend
npm run build
sudo systemctl reload nginx
```

#### Base de datos desconectada
```bash
# 1. Verificar MongoDB
sudo systemctl status mongodb
sudo systemctl start mongodb

# 2. Verificar conexión
mongo --eval "db.adminCommand('ismaster')"

# 3. Verificar logs
sudo journalctl -u mongodb -f

# 4. Reiniciar si es necesario
sudo systemctl restart mongodb
pm2 restart growx5-backend
```

#### Espacio en disco lleno
```bash
# 1. Verificar uso
df -h
du -sh /var/backups/*
du -sh ~/.pm2/logs/*

# 2. Limpiar logs antiguos
pm2 flush
find /var/backups -name "*.tar.gz" -mtime +3 -delete

# 3. Limpiar archivos temporales
sudo apt autoremove
sudo apt autoclean
```

### Comandos de Emergencia

```bash
# Reinicio completo de servicios
pm2 stop all
sudo systemctl stop nginx
sudo systemctl restart mongodb
pm2 start ecosystem.config.js
sudo systemctl start nginx

# Restauración rápida desde último backup
/usr/local/bin/backup-project.sh  # Backup actual
# Luego seguir pasos de restauración

# Verificación completa del sistema
curl -I https://grow5x.app
curl -I http://localhost:5000/api/health
pm2 status
sudo systemctl status nginx mongodb
```

### Contactos de Emergencia

- **Logs críticos**: `/var/log/syslog`, `~/.pm2/logs/`
- **Backups**: `/var/backups/`
- **Configuraciones**: `/var/www/growx5/`, `/etc/nginx/sites-available/`

---

## 📞 Soporte

Para soporte técnico:

1. **Revisar logs** en las ubicaciones mencionadas
2. **Ejecutar comandos de diagnóstico** de la sección troubleshooting
3. **Documentar el problema** con logs y pasos para reproducir
4. **Crear backup** antes de cualquier cambio mayor

---

*Documentación actualizada: $(date +"%Y-%m-%d %H:%M:%S")*
*Versión del sistema: Grow5X v1.0.0*