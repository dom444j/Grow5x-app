# 🚀 **Grow5X: Guía de Desarrollo y Lanzamiento**

> ⚠️ **IMPORTANTE:** Este proyecto NO usa blockchain, ni publica información en testnet, ni genera hashes públicos para auditoría externa. TODA la operativa interna es PRIVADA, anónima y visible solo por administradores autorizados. KYC está deshabilitado por defecto y solo se activa bajo circunstancias excepcionales.

## 1. **Visión Técnica General**

Grow5X es una herramienta tecnológica que permite a los usuarios delegar la gestión de su capital de riesgo para estrategias automatizadas de generación de ingresos, presentada como "descentralizada" por motivos de descargo de responsabilidad legal según `terminos-grow5x.pdf`. Opera como un sistema centralizado con una interfaz pública que garantiza anonimato y una operativa interna privada gestionada por agentes autónomos con IA.

La plataforma implementa un **sistema de transparencia interna** mediante logs privados y cifrados, asegurando trazabilidad sin exponer detalles operativos. Desplegada en `https://grow5x.app/` con un VPS en FlokiNET, prioriza un MVP funcional en **4-9 semanas** usando IA para acelerar desarrollo. La arquitectura modular soporta preregistro anónimo (email/Telegram, sin KYC obligatorio), referidos (10% de única vez), y un panel admin privado para gestionar operaciones internas.

## 2. **Roadmap de Desarrollo (Estimaciones con IA)**

El desarrollo se estructura en fases optimizadas para ejecución con herramientas de IA, ajustadas a un lanzamiento en **4-9 semanas** para reflejar la complejidad del proyecto y el tiempo requerido para auditorías y pruebas exhaustivas.

### Fase 1: Setup Inicial y MVP Web (Semanas 1-2)
- **Duración**: 1-2 semanas con IA
- **Tareas**:
  - Configurar repositorio Git con estructura completa
  - Establecer variables de entorno seguras
  - Inicializar VPS FlokiNET con stack completo
  - Desarrollar landing page con todas las secciones
  - Implementar preregistro anónimo (email/Telegram, sin KYC)
  - Configurar timer de 24 horas sincronizado
  - Añadir soporte multilingüe (es/en)
  - Optimizar SEO y rendimiento (Lighthouse > 90)
  - Publicar PDFs legales (solo descargos de responsabilidad)
- **Entregables**:
  - Landing page funcional en `https://grow5x.app/`
  - Formulario de preregistro seguro
  - Panel admin básico (sin exposición pública)
  - Documentación mínima (sin detalles operativos)

### Fase 2: Dashboard de Usuario y Referidos (Semanas 3-6)
- **Duración**: 3-4 semanas con IA
- **Tareas**:
  - Desarrollar dashboard de usuario completo
  - Implementar autenticación anónima (JWT)
  - Sistema de referidos con tracking (10% única vez)
  - Endpoint `/api/v1/user/capital-status` (estado básico público)
  - Notificaciones básicas (email/Telegram)
  - Panel admin avanzado con métricas (acceso restringido)
  - Logs estructurados internos cifrados
- **Entregables**:
  - Dashboard funcional
  - Sistema de referidos operativo
  - Notificaciones configuradas
  - Métricas administrativas privadas

### Fase 3: Automatización y Control Interno (Semanas 7-9)
- **Duración**: 2-3 semanas con IA
- **Tareas**:
  - Panel admin avanzado con módulos privados (`/ops/internal/`)
  - Gestión interna de operaciones (solo admin, sin documentación pública)
  - Logs internos cifrados (sin exposición)
  - Endpoints privados protegidos
  - Hardening de seguridad
  - PWA inicial
- **Entregables**:
  - Operativa interna funcional (privada)
  - Seguridad reforzada
  - PWA básica

### Fase 4: Expansión (Post-lanzamiento)
- **Tareas**:
  - Microservicios con Docker
  - App móvil nativa
  - Auditorías de seguridad (sin exposición de procesos internos)
  - Soporte multi-moneda
  - Automatización completa (procesos internos)

## 3. **Arquitectura y Estructura de Carpetas**

### 3.1. **Estructura Completa del Proyecto**

```
grow5x/
├── README.md
├── .gitignore
├── .env.example
├── package.json
├── docker-compose.yml
├── nginx.conf
└── docs/
    ├── README.md
    ├── SECURITY.md
    ├── API.md
    └── DEPLOYMENT.md

├── frontend/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Header.jsx
│       │   │   ├── Footer.jsx
│       │   │   └── Layout.jsx
│       │   ├── home/
│       │   │   ├── Hero.jsx
│       │   │   ├── Benefits.jsx
│       │   │   ├── HowItWorks.jsx
│       │   │   ├── Calculator.jsx
│       │   │   ├── Roadmap.jsx
│       │   │   ├── Testimonials.jsx
│       │   │   ├── FAQ.jsx
│       │   │   └── PreregModal.jsx
│       │   ├── dashboard/
│       │   │   ├── Dashboard.jsx
│       │   │   ├── Summary.jsx
│       │   │   ├── History.jsx
│       │   │   ├── Referrals.jsx
│       │   │   ├── Profile.jsx
│       │   │   └── CapitalStatus.jsx
│       │   ├── auth/
│       │   │   ├── Login.jsx
│       │   │   └── Register.jsx
│       │   └── common/
│       │       ├── Button.jsx
│       │       ├── Input.jsx
│       │       ├── Modal.jsx
│       │       ├── Loading.jsx
│       │       └── Timer.jsx
│       ├── contexts/
│       │   ├── AuthContext.jsx
│       │   ├── LanguageContext.jsx
│       │   └── ThemeContext.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useApi.js
│       │   ├── useLocalStorage.js
│       │   └── useTimer.js
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Legal.jsx
│       │   └── NotFound.jsx
│       ├── services/
│       │   ├── api.js
│       │   ├── auth.js
│       │   └── storage.js
│       └── utils/
│           ├── constants.js
│           ├── helpers.js
│           └── validators.js
│   └── public/
│       ├── index.html
│       ├── robots.txt
│       ├── sitemap.xml
│       ├── manifest.json
│       ├── docs/
│       │   ├── terms.pdf
│       │   ├── privacy.pdf
│       │   └── risk-disclosure.pdf
│       ├── locales/
│       │   ├── es.json
│       │   └── en.json
│       └── images/
│           ├── logo.svg
│           ├── hero-bg.webp
│           └── icons/

├── backend/
│   ├── package.json
│   ├── server.js
│   └── src/
│       ├── app.js
│       ├── config/
│       │   ├── database.js
│       │   ├── cors.js
│       │   ├── security.js
│       │   └── environment.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── preregistration.controller.js
│       │   ├── user.controller.js
│       │   ├── referral.controller.js
│       │   └── admin.controller.js
│       ├── models/
│       │   ├── User.model.js
│       │   ├── Preregistration.model.js
│       │   ├── Referral.model.js
│       │   └── Transaction.model.js
│       ├── routes/
│       │   ├── index.js
│       │   ├── auth.routes.js
│       │   ├── preregistration.routes.js
│       │   ├── user.routes.js
│       │   ├── referral.routes.js
│       │   └── admin.routes.js
│       ├── services/
│       │   ├── email.service.js
│       │   ├── telegram.service.js
│       │   ├── crypto.service.js
│       │   ├── referral.service.js
│       │   └── notification.service.js
│       ├── middleware/
│       │   ├── auth.middleware.js
│       │   ├── admin.middleware.js
│       │   ├── validation.middleware.js
│       │   ├── rateLimit.middleware.js
│       │   └── error.middleware.js
│       ├── validators/
│       │   ├── auth.validator.js
│       │   ├── preregistration.validator.js
│       │   └── user.validator.js
│       └── utils/
│           ├── logger.js
│           ├── encryption.js
│           ├── constants.js
│           └── helpers.js

├── ops/ (PRIVADO - NO PÚBLICO - NO DOCUMENTADO)
│   ├── internal/
│   │   ├── core.controller.js
│   │   ├── Operation.model.js
│   │   ├── ai.service.js
│   │   ├── automated.service.js
│   │   └── risk.service.js
│   ├── config/
│   │   ├── internal.config.js
│   │   └── private.config.js
│   └── logs/
│       └── (solo acceso admin)

├── scripts/
│   ├── setup-vps.sh
│   ├── deploy.sh
│   ├── backup.sh
│   ├── monitor.sh
│   ├── rotate-keys.sh
│   └── maintenance.sh

└── shared/
    ├── constants.js
    ├── types.js
    └── utils.js
```

### 3.2. **Configuración de robots.txt**

```
# /frontend/public/robots.txt
User-agent: *
Disallow: /admin
Disallow: /dashboard
Disallow: /ops
Disallow: /internal
Disallow: /private
Disallow: /api
Disallow: /_next
Disallow: /static

Allow: /
Allow: /docs/terms.pdf
Allow: /docs/privacy.pdf
Allow: /docs/risk-disclosure.pdf

Sitemap: https://grow5x.app/sitemap.xml
```

## 4. **Tecnologías y Stack Técnico**

### 4.1. **Frontend**
- **React 18**: Interfaces modulares y reactivas
- **Tailwind CSS**: Estilizado eficiente con paleta personalizada
- **Vite**: Build tool rápido y optimizado
- **i18next**: Soporte multilingüe (es/en)
- **React Query**: Manejo de datos asíncronos
- **React Hook Form**: Formularios seguros con validación
- **Framer Motion**: Animaciones fluidas

### 4.2. **Backend**
- **Node.js/Express**: API RESTful escalable
- **MongoDB**: Base de datos flexible con cifrado
- **Mongoose**: ODM con validación
- **Joi**: Validación de inputs
- **Winston**: Logging estructurado (solo logs privados)
- **JWT**: Autenticación sin estado
- **bcrypt**: Hash de contraseñas
- **crypto**: Cifrado AES-256

### 4.3. **Infraestructura**
- **FlokiNET VPS**: Hosting privado y anónimo
- **Nginx**: Reverse proxy con SSL
- **PM2**: Gestión de procesos con clustering
- **LetsEncrypt**: Certificados SSL automáticos
- **GitHub Actions**: CI/CD automatizado
- **MongoDB**: Base de datos local (sin servicios cloud expuestos)

### 4.4. **Seguridad**
- **UFW**: Firewall configurado
- **Fail2ban**: Protección contra ataques
- **Rate limiting**: 100 req/15 min por IP
- **CORS**: Configuración restrictiva
- **Helmet**: Headers de seguridad

### 4.5. **Entorno de Desarrollo**

#### Configuración de Terminal

**Windows (Recomendado: Git Bash)**
- **Git Bash**: Terminal Unix-like para Windows con soporte completo para scripts bash
- **Ubicación**: `C:\Program Files\Git\bin\bash.exe`
- **Verificación**: `& "C:\Program Files\Git\bin\bash.exe" --version`
- **Comandos soportados**: `ssh`, `scp`, `git`, `bash`, `curl`

**Ejecución de Scripts de Despliegue**
```bash
# Opción 1: Desde PowerShell
& "C:\Program Files\Git\bin\bash.exe" deploy-production-complete.sh

# Opción 2: Abrir Git Bash y ejecutar
bash deploy-production-complete.sh
```

**Ventajas de Git Bash**
- ✅ Soporte nativo para scripts bash (.sh)
- ✅ Comandos SSH/SCP integrados
- ✅ Compatible con scripts de despliegue Unix
- ✅ No requiere WSL o configuración adicional
- ✅ Sintaxis Unix estándar

**Alternativas**
- **WSL**: Windows Subsystem for Linux (requiere configuración adicional)
- **PowerShell**: Limitado para scripts bash, requiere adaptación de sintaxis
- **Sanitización**: Protección XSS

## 5. **Modelos de Datos**

### 5.1. **User Model**
```javascript
// backend/src/models/User.model.js
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  telegram: { type: String, unique: true, sparse: true },
  country: String,
  language: { type: String, default: 'es' },
  referralCode: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  verification: {
    verified: { type: Boolean, default: false },
    documents: [String],
    verificationDate: Date,
    required: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
}, {
  timestamps: true
});
```

### 5.2. **Preregistration Model**
```javascript
// backend/src/models/Preregistration.model.js
const preregistrationSchema = new mongoose.Schema({
  email: String,
  telegram: String,
  fullName: String,
  country: String,
  estimatedAmount: Number,
  status: { 
    type: String, 
    enum: ['pending', 'contacted', 'converted', 'rejected'], 
    default: 'pending' 
  },
  source: String,
  acceptedTerms: { type: Boolean, default: false },
  acceptedRisk: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});
```

### 5.3. **Referral Model**
```javascript
// backend/src/models/Referral.model.js
const referralSchema = new mongoose.Schema({
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referred: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  commissionRate: { type: Number, default: 0.10 }, // 10%
  commissionPaid: { type: Number, default: 0 },
  referredEarnings: { type: Number, default: 0 },
  completedAt: Date,
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});
```

### 5.4. **Transaction Model**
```javascript
// backend/src/models/Transaction.model.js
const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['deposit', 'withdrawal', 'earnings', 'commission'], 
    required: true 
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USDT' },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  externalId: String,
  description: String,
  metadata: {
    platform: String,
    reference: String
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
}, {
  timestamps: true
});
```

## 6. **API Endpoints Públicos**

### 6.1. **Endpoints de Usuario Final**

```javascript
// Preregistro
POST /api/v1/preregistrations
GET /api/v1/preregistrations/validate

// Autenticación
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh

// Usuario
GET /api/v1/user/profile
PUT /api/v1/user/profile
GET /api/v1/user/capital-status  // Solo estado básico
GET /api/v1/user/transactions    // Solo datos públicos

// Referidos
GET /api/v1/referrals/my-referrals
GET /api/v1/referrals/stats
POST /api/v1/referrals/generate-link

// Público
GET /api/v1/public/stats
GET /api/v1/public/timer
```

### 6.2. **Endpoints Administrativos (Privados)**

```javascript
// Admin (protegidos, sin documentar públicamente)
GET /api/v1/admin/preregistrations
PUT /api/v1/admin/preregistrations/:id/status
GET /api/v1/admin/users
GET /api/v1/admin/referrals
GET /api/v1/admin/transactions
GET /api/v1/admin/stats
POST /api/v1/admin/notifications

// PRIVADO - Solo acceso interno (sin documentar)
// /ops/internal/* - Solo admin
```

## 7. **Seguridad y Privacidad**

### 7.1. **Configuración de Seguridad**

```javascript
// backend/src/config/security.js
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const securityConfig = {
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"], // Sin conexiones externas no autorizadas
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),
  
  rateLimit: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por ventana
    message: 'Demasiadas solicitudes, intenta más tarde',
    standardHeaders: true,
    legacyHeaders: false,
  })
};
```

### 7.2. **Cifrado de Datos**

```javascript
// backend/src/utils/encryption.js
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

export const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

export const decrypt = (encryptedData) => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    ENCRYPTION_KEY, 
    Buffer.from(encryptedData.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

## 8. **Scripts de Automatización**

### 8.1. **Script de Despliegue**

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Iniciando despliegue de Grow5X..."

# Variables
REPO_URL="https://github.com/username/grow5x.git"
PROJECT_DIR="/var/www/grow5x"
BACKUP_DIR="/var/backups/grow5x"

# Crear backup
echo "📦 Creando backup..."
sudo mkdir -p $BACKUP_DIR
sudo tar -czf $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz $PROJECT_DIR

# Actualizar código
echo "📥 Actualizando código..."
cd $PROJECT_DIR
git pull origin main

# Frontend
echo "🎨 Construyendo frontend..."
cd frontend
npm ci --production
npm run build

# Backend
echo "⚙️ Actualizando backend..."
cd ../backend
npm ci --production

# Reiniciar servicios
echo "🔄 Reiniciando servicios..."
pm2 restart grow5x-backend
sudo systemctl reload nginx

# Verificar salud
echo "🏥 Verificando salud del servicio..."
sleep 5
curl -f http://localhost:5000/api/v1/health || exit 1

echo "✅ Despliegue completado exitosamente!"
```

### 8.2. **Script de Monitoreo (Sin exponer logs internos)**

```bash
#!/bin/bash
# scripts/monitor.sh

# Configuración
API_URL="http://localhost:5000"
LOG_FILE="/var/log/grow5x/monitor.log"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
TELEGRAM_CHAT_ID="${TELEGRAM_ALERT_CHAT_ID}"

# Umbrales
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=85
RESPONSE_TIME_THRESHOLD=5000

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_alert() {
    local message="$1"
    local level="$2"
    
    # Emojis por nivel
    case $level in
        "critical") emoji="🚨" ;;
        "warning") emoji="⚠️" ;;
        "info") emoji="ℹ️" ;;
        *) emoji="📊" ;;
    esac
    
    if [[ -n "$TELEGRAM_BOT_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d chat_id="$TELEGRAM_CHAT_ID" \
            -d text="$emoji GROW5X MONITOR: $message" \
            -d parse_mode="Markdown"
    fi
    
    log "$level: $message"
}

# Verificar API Health (sin exponer detalles internos)
check_api_health() {
    log "Verificando salud de la API..."
    
    local start_time=$(date +%s%3N)
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" --max-time 10)
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [[ "$response_code" != "200" ]]; then
        send_alert "API no responde (HTTP $response_code)" "critical"
        log "Reiniciando servicio backend..."
        pm2 restart grow5x-backend
        sleep 10
        
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" --max-time 10)
        if [[ "$response_code" == "200" ]]; then
            send_alert "API recuperada después de reinicio" "info"
        else
            send_alert "API sigue sin responder después de reinicio" "critical"
        fi
    elif [[ $response_time -gt $RESPONSE_TIME_THRESHOLD ]]; then
        send_alert "API lenta: ${response_time}ms (>$RESPONSE_TIME_THRESHOLD ms)" "warning"
    else
        log "API funcionando correctamente (${response_time}ms)"
    fi
}

# Verificar recursos del sistema
check_system_resources() {
    # CPU
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    cpu_usage=${cpu_usage%.*}
    
    if [[ $cpu_usage -gt $CPU_THRESHOLD ]]; then
        send_alert "Uso de CPU crítico: ${cpu_usage}% (>$CPU_THRESHOLD%)" "warning"
    fi
    
    # Memoria
    local memory_info=$(free | awk '/Mem/ {printf "%.0f %.0f %.0f", $3/$2*100, $2/1024/1024, $3/1024/1024}')
    local memory_percent=$(echo $memory_info | awk '{print $1}')
    local total_gb=$(echo $memory_info | awk '{print $2}')
    local used_gb=$(echo $memory_info | awk '{print $3}')
    
    if [[ ${memory_percent%.*} -gt $MEMORY_THRESHOLD ]]; then
        send_alert "Uso de memoria crítico: ${memory_percent}% (${used_gb}GB/${total_gb}GB)" "warning"
    fi
    
    # Disco
    local disk_info=$(df / | awk 'NR==2 {print $5 " " $4}')
    local disk_percent=$(echo $disk_info | awk '{print $1}' | cut -d'%' -f1)
    local available_gb=$(echo $disk_info | awk '{print $2/1024/1024}')
    
    if [[ $disk_percent -gt $DISK_THRESHOLD ]]; then
        send_alert "Espacio en disco crítico: ${disk_percent}% (${available_gb}GB disponibles)" "critical"
    fi
    
    log "Recursos del sistema: CPU ${cpu_usage}%, RAM ${memory_percent}%, Disco ${disk_percent}%"
}

# Verificar servicios básicos
check_services() {
    # MongoDB
    if ! pgrep mongod > /dev/null; then
        send_alert "MongoDB no está ejecutándose" "critical"
        sudo systemctl restart mongod
    fi
    
    # Nginx
    if ! pgrep nginx > /dev/null; then
        send_alert "Nginx no está ejecutándose" "critical"
        sudo systemctl start nginx
    fi
    
    # PM2
    if ! pm2 list | grep -q "online"; then
        send_alert "Procesos PM2 con problemas" "warning"
        pm2 restart all
    fi
}

# Verificar errores recientes (sin exponer contenido)
check_error_logs() {
    local error_log="/var/log/grow5x/error.log"
    local current_time=$(date +%s)
    local five_minutes_ago=$((current_time - 300))
    
    if [[ -f "$error_log" ]]; then
        local recent_errors=$(find "$error_log" -newermt "@$five_minutes_ago" -exec grep -c "ERROR\|CRITICAL" {} \; 2>/dev/null || echo "0")
        
        if [[ $recent_errors -gt 5 ]]; then
            send_alert "Múltiples errores detectados en los últimos 5 minutos: $recent_errors" "warning"
        fi
    fi
}

# Ejecutar todas las verificaciones
main() {
    log "=== Iniciando monitoreo de Grow5X ==="
    
    check_api_health
    check_system_resources
    check_services
    check_error_logs
    
    log "=== Monitoreo completado ==="
}

# Ejecutar monitoreo
main
```

## 9. **Configuración de Entorno**

### 9.1. **Variables de Entorno (.env.example)**

```env
# Aplicación
NODE_ENV=production
PORT=5000
APP_NAME=Grow5X
APP_URL=https://grow5x.app

# Base de datos
MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority
MONGODB_TEST_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5_test?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-64-chars-minimum
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-here-64-chars-minimum
JWT_REFRESH_EXPIRES_IN=30d

# Cifrado
ENCRYPTION_KEY=your-32-character-encryption-key-exactly-32-chars

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@grow5x.app
SMTP_PASSWORD=your-smtp-password

# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
TELEGRAM_ALERT_CHAT_ID=your-alert-chat-id
TELEGRAM_CHANNEL=https://t.me/CanalGrow5X

# Timer
REGISTRATION_TIMER_HOURS=24

# Referidos
REFERRAL_COMMISSION_RATE=0.10

# Admin (emails separados por comas, sin espacios)
ADMIN_EMAILS=admin@grow5x.app,owner@grow5x.app
SUPER_ADMIN_EMAILS=owner@grow5x.app

# Logs
LOG_LEVEL=info
LOG_FILE=/var/log/grow5x/app.log

# Backup
BACKUP_DIR=/var/backups/grow5x
BACKUP_RETENTION_DAYS=7

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_LOGIN_MAX=5

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-64-chars-minimum
```

## 10. **Checklist de Lanzamiento Actualizado**

### 10.1. **Pre-lanzamiento**

- [ ] **Infraestructura Segura**
  - [ ] VPS FlokiNET configurado con acceso SSH restringido
  - [ ] Nginx con SSL forzado (HTTPS únicamente)
  - [ ] MongoDB con autenticación y cifrado
  - [ ] Firewall UFW con puertos mínimos abiertos
  - [ ] Fail2ban activo contra ataques de fuerza bruta
  - [ ] Backups automáticos cifrados y probados
  - [ ] Logs privados sin exposición externa

- [ ] **Frontend Público**
  - [ ] Landing page sin referencias a operativa interna
  - [ ] Formulario de preregistro anónimo (sin KYC obligatorio)
  - [ ] Timer sincronizado con backend
  - [ ] Traducciones completas es/en
  - [ ] SEO optimizado con términos genéricos
  - [ ] Lighthouse > 90 en todas las métricas
  - [ ] robots.txt bloqueando rutas sensibles

- [ ] **Backend Privado**
  - [ ] API pública documentada (solo endpoints de usuario)
  - [ ] Rutas administrativas protegidas y no documentadas
  - [ ] Autenticación JWT con tokens seguros
  - [ ] Rate limiting agresivo implementado
  - [ ] Logs estructurados sin exposición de datos sensibles
  - [ ] Cifrado AES-256 para datos críticos

- [ ] **Documentación Legal**
  - [ ] Términos de descargo de responsabilidad
  - [ ] Aviso de riesgo prominente
  - [ ] Política de privacidad para datos mínimos
  - [ ] Sin menciones a compliance ni regulaciones
  - [ ] Disclaimers claros: "no entidad financiera"

- [ ] **Seguridad Operativa**
  - [ ] Variables de entorno seguras (.env con claves largas)
  - [ ] Rotación automática de claves
  - [ ] Admin emails configurados sin exposición
  - [ ] Panel administrativo completamente privado
  - [ ] Sin logs ni trazas de operativa interna en frontend

### 10.2. **Testing de Seguridad**

- [ ] **Tests de Penetración**
  - [ ] Inyección SQL/NoSQL
  - [ ] XSS y CSRF
  - [ ] Enumeración de usuarios
  - [ ] Fuerza bruta en login
  - [ ] Acceso no autorizado a rutas admin

- [ ] **Tests de Privacidad**
  - [ ] Verificar que no se exponen datos internos
  - [ ] Confirmar anonimato en registros
  - [ ] Validar cifrado de datos sensibles
  - [ ] Probar logs sin información comprometedora
  - [ ] Verificar que panel admin es inaccesible públicamente

- [ ] **Tests de Rendimiento**
  - [ ] Load testing con rate limiting
  - [ ] Stress testing de base de datos
  - [ ] Verificar que operativa interna no afecta frontend
  - [ ] Monitoreo sin alertas públicas

### 10.3. **Post-lanzamiento**

- [ ] **Monitoreo Silencioso**
  - [ ] Alertas solo a admin via Telegram privado
  - [ ] Métricas internas sin exposición
  - [ ] Dashboard admin con acceso ultra-restringido
  - [ ] Logs rotados y cifrados automáticamente

- [ ] **Operativa Interna**
  - [ ] Procesos automatizados funcionando en `/ops/`
  - [ ] Sin rastros públicos de actividad interna
  - [ ] Gestión de capital completamente privada
  - [ ] Sistema de alertas interno para admin únicamente

## 11. **Resumen Ejecutivo Final**

Grow5X es una **herramienta tecnológica** que permite a los usuarios delegar su **capital de riesgo** para estrategias automatizadas, con **operativa interna 100% privada** y **anonimato garantizado**. 

**Ajustes críticos implementados:**
- ❌ **Sin exposición operativa interna**
- ❌ **Sin KYC obligatorio** - solo opcional
- ❌ **Sin documentación pública** de procesos internos
- ✅ **Privacidad total** de operativa interna
- ✅ **Anonimato** en registro (email/Telegram)
- ✅ **Panel admin** ultra-privado y protegido
- ✅ **Logs internos** cifrados sin exposición

**Stack Tecnológico Final:**
- **Frontend**: React 18 + Tailwind CSS (público, sin detalles internos)
- **Backend**: Node.js + Express + MongoDB (API pública + rutas privadas)
- **Operativa Interna**: `/ops/internal/` (solo admin, sin documentar)
- **Seguridad**: Cifrado AES-256, JWT, rate limiting agresivo
- **Infraestructura**: FlokiNET VPS + Nginx + PM2 (hosting anónimo)

**Principios Operativos:**
1. **Máxima Privacidad**: Toda operativa interna permanece oculta
2. **Anonimato Usuario**: Solo email/Telegram, sin KYC por defecto
3. **Sin Exposición**: Ningún detalle de automatización o estrategias
4. **Descargos Únicamente**: Sin compliance ni esfuerzos regulatorios
5. **Seguridad Silenciosa**: Alertas y logs solo para admin
6. **Panel Admin Invisible**: Acceso ultra-restringido, sin documentación pública

**Próximos Pasos Inmediatos:**
1. **Configurar repositorio** con estructura ajustada (sin carpetas públicas de operativa)
2. **Limpiar documentación** eliminando cualquier referencia a procesos internos
3. **Implementar landing** con términos genéricos ("sistema automatizado", "algoritmos avanzados")
4. **Configurar panel admin** con acceso ultra-restringido y sin documentación pública
5. **Establecer operativa interna** en `/ops/internal/` completamente privada
6. **Verificar privacidad** - auditar que no se expone información sensible
7. **Lanzar MVP** con máxima privacidad y anonimato

