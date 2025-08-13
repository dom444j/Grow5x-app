# 📁 ESTRUCTURA LOCAL DEL PROYECTO GROWX5

**Fecha de documentación:** 9 de Agosto, 2025  
**Estado:** ✅ Verificado y funcional  
**Conexión MongoDB Atlas:** ✅ Activa  
**VPS Target:** 80.78.25.79 (grow5x.app)  

---

## 🏗️ ESTRUCTURA DE CARPETAS

### 📂 Carpeta Raíz: `C:\Users\DOM\Desktop\growx5-app`

```
growx5-app/
├── backend/                    # Servidor Node.js + Express
│   ├── src/                   # Código fuente principal
│   │   ├── controllers/       # Controladores de la API
│   │   ├── routes/           # Rutas de la API
│   │   ├── models/           # Modelos de MongoDB
│   │   ├── middleware/       # Middleware personalizado
│   │   ├── services/         # Servicios de negocio
│   │   ├── utils/            # Utilidades
│   │   └── config/           # Configuraciones
│   ├── controllers/          # Controladores adicionales
│   ├── routes/              # Rutas adicionales
│   ├── models/              # Modelos adicionales
│   ├── logs/                # Logs del sistema
│   ├── uploads/             # Archivos subidos
│   ├── docs/                # Documentación del backend
│   ├── server.js            # Servidor principal
│   ├── package.json         # Dependencias del backend
│   ├── .env                 # Variables de entorno
│   └── ecosystem.config.js  # Configuración PM2
│
├── frontend/                   # Aplicación React + Vite
│   ├── src/                   # Código fuente del frontend
│   │   ├── components/        # Componentes React
│   │   │   ├── admin/        # Componentes de administración
│   │   │   ├── user/         # Componentes de usuario
│   │   │   └── common/       # Componentes comunes
│   │   ├── pages/            # Páginas principales
│   │   │   ├── admin/        # Páginas de administración
│   │   │   └── user/         # Páginas de usuario
│   │   ├── services/         # Servicios de API
│   │   ├── contexts/         # Contextos de React
│   │   ├── routes/           # Configuración de rutas
│   │   ├── utils/            # Utilidades del frontend
│   │   ├── styles/           # Estilos CSS
│   │   └── locales/          # Traducciones
│   ├── public/               # Archivos públicos
│   ├── package.json          # Dependencias del frontend
│   ├── .env                  # Variables de entorno
│   ├── vite.config.js        # Configuración de Vite
│   └── index.html            # Archivo HTML principal
│
├── docs/                      # Documentación del proyecto
│   ├── api/                  # Documentación de API
│   ├── modulos/              # Documentación de módulos
│   └── *.md                  # Archivos de documentación
│
├── scripts/                   # Scripts de utilidad (vacío)
├── .gitignore                # Archivos ignorados por Git
├── README.md                 # Documentación principal
└── ESTRUCTURA-LOCAL.md       # Este archivo
```

---

## 🔧 RUTAS RELATIVAS PRINCIPALES

### Backend
- **Ruta relativa:** `./backend/`
- **Servidor principal:** `./backend/server.js`
- **Configuración:** `./backend/.env`
- **Puerto:** `3000`

### Frontend
- **Ruta relativa:** `./frontend/`
- **Archivo principal:** `./frontend/src/main.jsx`
- **Configuración:** `./frontend/.env`
- **Puerto:** `5173`

### Scripts
- **Ruta relativa:** `./scripts/` (actualmente vacío)

---

## 📄 ARCHIVOS CRÍTICOS

### 🔐 Variables de Entorno

#### Backend (`.env`)
```
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=...
```

#### Frontend (`.env`)
```
VITE_API_URL=http://localhost:3000
VITE_API_VERSION=v1
VITE_API_TIMEOUT=30000
VITE_APP_NAME=GrowX5
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Plataforma de inversión
VITE_APP_URL=http://localhost:5173
```

### 📦 Gestión de Dependencias

#### Backend (`package.json`)
- **Scripts principales:**
  - `npm run dev` - Servidor de desarrollo
  - `npm start` - Servidor de producción
  - `npm test` - Ejecutar tests
  - `npm run lint` - Linter

#### Frontend (`package.json`)
- **Scripts principales:**
  - `npm run dev` - Servidor de desarrollo
  - `npm run build` - Build de producción
  - `npm run preview` - Preview del build
  - `npm run lint` - Linter

---

## 🚫 ARCHIVOS IGNORADOS (.gitignore)

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
.next/
out/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary files
tmp/
temp/

# Uploads
uploads/

# Cache
.cache/
.parcel-cache/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache
```

---

## ⚡ COMANDOS DE BUILD LOCAL

### 🚀 Desarrollo (Recomendado)

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```
**Puerto:** http://localhost:3000  
**Estado:** ✅ Funcionando

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```
**Puerto:** http://localhost:5173  
**Estado:** ✅ Funcionando

### 🏗️ Build de Producción

#### Backend
```bash
cd backend
npm start
```

#### Frontend
```bash
cd frontend
npm run build
npm run preview
```

---

## 🔌 ENDPOINTS VERIFICADOS

### ✅ Endpoints Funcionales
- `GET /api/health` - Estado del servidor
- `GET /api/packages` - Paquetes disponibles
- `GET /api/admin/users` - Usuarios (requiere auth)
- `GET /api/user/notifications` - Notificaciones (requiere auth)

### ❌ Endpoints con Problemas
- `GET /api/products` - Ruta no encontrada
- `GET /api/users/profile` - Ruta no encontrada

### 🔐 Autenticación
- **Método:** JWT Bearer Token
- **Header:** `Authorization: Bearer <token>`
- **Endpoints públicos:** `/api/health`, `/api/packages`
- **Endpoints protegidos:** `/api/admin/*`, `/api/user/*`

---

## 🗄️ CONEXIÓN A BASE DE DATOS

### MongoDB Atlas
- **Estado:** ✅ Conectado
- **URI:** Configurado en `.env`
- **Colecciones principales:**
  - `users` - Usuarios del sistema
  - `packages` - Paquetes/Licencias
  - `products` - Productos
  - `transactions` - Transacciones
  - `referrals` - Sistema de referidos
  - `notifications` - Notificaciones

---

## 🎯 MÓDULOS CRÍTICOS VERIFICADOS

### ✅ Módulos Funcionales
1. **Autenticación** - JWT implementado
2. **Usuarios** - Gestión básica funcionando
3. **Paquetes** - API completamente funcional
4. **Admin** - Panel de administración disponible
5. **Base de datos** - Conexión MongoDB Atlas activa

### ⚠️ Módulos Pendientes de Verificación
1. **Productos** - Ruta no encontrada
2. **Wallets** - Pendiente de prueba
3. **Reportes** - Pendiente de prueba
4. **Flujo E2E** - Pendiente de prueba completa

---

## 🔄 PRÓXIMOS PASOS

1. **Corregir rutas de productos**
2. **Verificar endpoints de wallets**
3. **Probar flujo completo admin → productos → usuarios**
4. **Verificar sistema de reportes**
5. **Documentar flujo de autenticación completo**

---

## 🌐 INFORMACIÓN DEL VPS DESTINO

### 📡 Detalles del Servidor
- **IP Principal:** 80.78.25.79
- **IPv6:** 2a0a:3840:8078:25::504e:194f:1337
- **Dominio:** grow5x.app
- **Acceso SSH:** root@80.78.25.79 (con clave SSH)
- **Sistema:** Ubuntu (por confirmar versión)

### 🔗 Conexión SSH
```bash
# Conexión directa por IP
ssh root@80.78.25.79

# Conexión por dominio
ssh root@grow5x.app
```

---

**📝 Nota:** Esta documentación refleja el estado actual del proyecto local verificado el 9 de Agosto de 2025. La información del VPS es real y verificada.