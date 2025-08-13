# Grow5X - Plataforma de Inversión

Plataforma completa de inversión con sistema de referidos, gestión de wallets y panel administrativo.

## Estructura del Proyecto

```
/backend     # API Node.js + Express + MongoDB
/frontend    # React + Vite + TailwindCSS
/scripts     # Scripts de utilidad (vacío)
/docs        # Documentación técnica
```

## Despliegue Manual

### Variables de Entorno Requeridas

**Backend (.env):**
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
PORT=5000
NODE_ENV=production
```

**Frontend (.env):**
```
VITE_API_URL=https://yourdomain.com/api
```

### Checklist de Despliegue

1. **Build local:** `cd frontend && npm run build`
2. **Subir backend:** Copiar `/backend` al VPS
3. **Subir frontend:** Copiar `/frontend/dist` al VPS
4. **Instalar dependencias:** `cd backend && npm install --production`
5. **Configurar variables:** Crear `.env` en backend
6. **Configurar Nginx:** Proxy `/api` → `localhost:5000`, servir static desde `/dist`
7. **Iniciar backend:** `pm2 start server.js --name grow5x`
8. **Recargar Nginx:** `sudo nginx -s reload`
9. **Verificar API:** `curl https://yourdomain.com/api/health`
10. **Verificar frontend:** Abrir navegador y probar funcionalidad

## Desarrollo Local

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (nueva terminal)
cd frontend
npm install
npm run dev
```

## Tecnologías

- **Backend:** Node.js, Express, MongoDB, JWT
- **Frontend:** React, Vite, TailwindCSS, Axios
- **Despliegue:** PM2, Nginx, VPS

## Licencia

Privado - Grow5X Team