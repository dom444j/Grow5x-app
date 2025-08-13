# Flujo Oficial de Cambios - Grow5x Platform

## Descripción General

Este documento establece el flujo oficial para gestionar cambios en la plataforma Grow5x, desde el desarrollo local hasta la implementación en producción.

## Flujo de Trabajo: Local → GitHub → VPS

### 1. Desarrollo Local

#### Configuración Inicial
```bash
# Clonar repositorio
git clone https://github.com/dom444j/Grow5x-app.git
cd Grow5x-app

# Instalar dependencias
cd backend && npm install
cd ../frontend && npm install
```

#### Desarrollo de Features
```bash
# Crear rama para nueva feature
git checkout -b feature/nombre-feature

# Desarrollar y probar localmente
npm run dev  # Frontend
npm start    # Backend

# Commit de cambios
git add .
git commit -m "feat: descripción del cambio"
git push -u origin feature/nombre-feature
```

### 2. Gestión en GitHub

#### Pull Requests
```bash
# Crear PR desde rama feature
gh pr create --title "Feature: Título descriptivo" \
             --body "Descripción detallada" \
             --base master

# Revisar y aprobar PR
# Merge a master después de revisión
```

#### Hotfixes Críticos
```bash
# Para cambios urgentes en producción
git checkout -b hotfix/descripcion-hotfix

# Aplicar cambios críticos
git add .
git commit -m "hotfix: descripción del cambio crítico"
git push -u origin hotfix/descripcion-hotfix

# Crear PR de hotfix
gh pr create --title "Hotfix: Descripción" \
             --body "Cambio crítico aplicado" \
             --base master
```

### 3. Deployment a VPS

#### Preparación del Release
```bash
# En el VPS, navegar al directorio de releases
cd /var/www/grow5x/releases

# Crear nuevo directorio de release
sudo mkdir $(date +%Y%m%d_%H%M%S)
cd $(date +%Y%m%d_%H%M%S)

# Clonar código desde GitHub
sudo git clone https://github.com/dom444j/Grow5x-app.git .
sudo git checkout master  # o tag específico
```

#### Instalación y Configuración
```bash
# Instalar dependencias del backend
cd backend
sudo npm install --production

# Copiar archivos de configuración
sudo cp /var/www/grow5x/current/backend/.env ./

# Instalar y compilar frontend
cd ../frontend
sudo npm install
sudo npm run build
```

#### Activación del Release
```bash
# Actualizar symlink
sudo rm /var/www/grow5x/current
sudo ln -s /var/www/grow5x/releases/$(date +%Y%m%d_%H%M%S) /var/www/grow5x/current

# Reiniciar servicios
sudo pm2 restart grow5x-backend
sudo systemctl reload nginx
```

## Tipos de Cambios

### Features (Nuevas Funcionalidades)
- **Rama**: `feature/nombre-feature`
- **Proceso**: Desarrollo local → PR → Review → Merge → Deploy
- **Tiempo**: 1-7 días

### Bugfixes (Corrección de Errores)
- **Rama**: `bugfix/descripcion-bug`
- **Proceso**: Desarrollo local → PR → Review → Merge → Deploy
- **Tiempo**: 1-3 días

### Hotfixes (Cambios Críticos)
- **Rama**: `hotfix/descripcion-hotfix`
- **Proceso**: Aplicar en VPS → Consolidar en GitHub → PR → Merge
- **Tiempo**: Inmediato

## Validaciones Requeridas

### Pre-Deploy Checklist
- [ ] Código revisado y aprobado
- [ ] Tests pasando localmente
- [ ] Configuración de producción verificada
- [ ] Backup de release anterior disponible

### Post-Deploy Validation
- [ ] `/api/health` respondiendo correctamente
- [ ] Login administrativo funcional
- [ ] Frontend cargando sin errores
- [ ] Logs de PM2 sin errores críticos
- [ ] Nginx sirviendo contenido correctamente

## Comandos de Verificación

### Health Check Completo
```bash
# Verificar API
curl -X GET https://grow5x.com/api/health

# Verificar login
curl -X POST https://grow5x.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@grow5x.com","password":"Admin2024!"}'

# Verificar PM2
pm2 status
pm2 logs grow5x-backend --lines 20

# Verificar Nginx
sudo nginx -t
sudo systemctl status nginx
```

### Rollback de Emergencia
```bash
# En caso de problemas, volver al release anterior
sudo rm /var/www/grow5x/current
sudo ln -s /var/www/grow5x/releases/RELEASE_ANTERIOR /var/www/grow5x/current
sudo pm2 restart grow5x-backend
sudo systemctl reload nginx
```

## Estructura de Releases

```
/var/www/grow5x/
├── current -> releases/20250813_143000/
├── releases/
│   ├── 20250812_232251/  # Release anterior
│   ├── 20250813_143000/  # Release actual
│   └── 20250813_150000/  # Nuevo release
└── shared/
    ├── logs/
    ├── uploads/
    └── node_modules/
```

## Contactos y Responsabilidades

- **Desarrollador Principal**: DOM
- **Repositorio**: https://github.com/dom444j/Grow5x-app
- **Servidor de Producción**: 80.78.25.79
- **Dominio**: https://grow5x.com

## Notas Importantes

1. **Siempre hacer backup** antes de aplicar cambios en producción
2. **Validar en local** antes de hacer deploy
3. **Documentar cambios** en commits y PRs
4. **Monitorear logs** después de cada deploy
5. **Mantener releases anteriores** para rollback rápido

---

*Última actualización: 13 de Agosto, 2025*
*Versión del documento: 1.0*