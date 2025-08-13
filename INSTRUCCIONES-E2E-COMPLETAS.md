# 🧪 PRUEBAS E2E FUNCIONALES COMPLETAS - GROW5X

## 📋 Resumen

Este documento describe cómo ejecutar las **pruebas End-to-End (E2E) funcionales completas** para validar todo el flujo de usuario de Grow5x, complementando las pruebas de infraestructura y seguridad ya realizadas.

## 🎯 Objetivo

Validar el flujo funcional completo descrito en `avances-finales.md`:

✅ **Registro con link de referido y confirmación en DB**  
✅ **Verificación de email en sandbox**  
✅ **Login y persistencia de sesión**  
✅ **Flujo completo de recuperación de contraseña**  
✅ **Validación de campos del perfil/panel**  
✅ **Verificación de árbol de referidos (DB y panel)**  
✅ **Revisión de logs sin errores**  

## 🛠️ Herramientas Disponibles

Se han preparado **2 enfoques** para las pruebas E2E:

### 1. 🎭 **Playwright (Pruebas UI Completas)**
- **Archivo**: `e2e-functional-tests.js`
- **Ejecutor**: `run-e2e-tests.bat`
- **Ventajas**: Pruebas visuales completas, screenshots automáticos
- **Tiempo**: ~5-10 minutos

### 2. 📡 **Postman/Newman (Pruebas API Rápidas)**
- **Archivo**: `grow5x-e2e-api-tests.postman_collection.json`
- **Ejecutor**: `run-postman-tests.bat`
- **Ventajas**: Ejecución rápida, reportes HTML detallados
- **Tiempo**: ~2-3 minutos

## 🚀 Ejecución Rápida

### Opción A: Pruebas UI Completas (Playwright)

```bash
# Ejecutar script automatizado
.\run-e2e-tests.bat
```

**O manualmente:**
```bash
# 1. Instalar dependencias
npm install
npx playwright install

# 2. Ejecutar pruebas
node e2e-functional-tests.js
```

### Opción B: Pruebas API Rápidas (Postman)

```bash
# Ejecutar script automatizado
.\run-postman-tests.bat
```

**O manualmente:**
```bash
# 1. Instalar Newman
npm install -g newman newman-reporter-html

# 2. Ejecutar colección
newman run grow5x-e2e-api-tests.postman_collection.json --reporters cli,html --reporter-html-export e2e-api-report.html
```

## 📊 Resultados y Reportes

### Playwright (UI)
- **📁 Screenshots**: `./e2e-screenshots/`
- **📄 Resultados**: `./e2e-results.json`
- **🖥️ Consola**: Resumen en tiempo real

### Postman (API)
- **📄 Reporte HTML**: `./e2e-api-report.html`
- **🖥️ Consola**: Resultados detallados
- **📊 Métricas**: Tiempos de respuesta, assertions

## 🧪 Pruebas Incluidas

### 1. **Registro con Referido**
- ✅ Navegación a `/register?ref=CODIGO`
- ✅ Auto-completado del código de referido
- ✅ Validación de todos los campos requeridos
- ✅ Confirmación de registro exitoso

### 2. **Verificación en Base de Datos**
- ✅ Usuario creado correctamente
- ✅ Relación de referido establecida
- ✅ Código de referido único asignado

### 3. **Login y Sesión**
- ✅ Autenticación exitosa
- ✅ Redirección al dashboard
- ✅ Persistencia tras reload
- ✅ Token JWT válido

### 4. **Gestión de Perfil**
- ✅ Acceso a campos editables
- ✅ Actualización de información
- ✅ Guardado de cambios
- ✅ Validación de datos

### 5. **Árbol de Referidos**
- ✅ Visualización del árbol
- ✅ Estadísticas correctas
- ✅ Estructura de datos válida

### 6. **Recuperación de Contraseña**
- ✅ Solicitud de reset
- ✅ Envío de email
- ✅ Flujo completo funcional

### 7. **Validaciones de Seguridad**
- ✅ Rate limiting activo
- ✅ Headers de seguridad
- ✅ Logs sin errores críticos

## 🔧 Configuración

### Variables de Entorno
```javascript
// Configuración automática en scripts
const CONFIG = {
  baseUrl: 'https://grow5x.app',
  testEmail: `test.e2e.${timestamp}@example.com`,
  testPassword: 'TestPassword123!',
  referralCode: '04ZABST6' // Código existente
};
```

### Personalización
Puedes modificar:
- **URL base**: Cambiar entre staging/producción
- **Datos de prueba**: Email, contraseña, país
- **Timeouts**: Ajustar tiempos de espera
- **Screenshots**: Habilitar/deshabilitar capturas

## 📋 Checklist de Validación

Antes de marcar como "E2E OK":

- [ ] **Registro**: Usuario creado con referido
- [ ] **Base de Datos**: Relación confirmada
- [ ] **Login**: Autenticación exitosa
- [ ] **Sesión**: Persistencia validada
- [ ] **Perfil**: Campos editables funcionan
- [ ] **Referidos**: Árbol visible y correcto
- [ ] **Recovery**: Flujo de reset funcional
- [ ] **Logs**: Sin errores críticos
- [ ] **Seguridad**: Rate limiting activo
- [ ] **Performance**: Tiempos de respuesta < 2s

## 🚨 Solución de Problemas

### Error: "Node.js no encontrado"
```bash
# Instalar Node.js desde https://nodejs.org/
# Verificar instalación
node --version
npm --version
```

### Error: "Playwright no instalado"
```bash
npx playwright install
```

### Error: "Newman no encontrado"
```bash
npm install -g newman newman-reporter-html
```

### Error: "Timeout en pruebas"
- Verificar conectividad a `https://grow5x.app`
- Aumentar timeouts en configuración
- Ejecutar en horarios de menor carga

## 📈 Interpretación de Resultados

### ✅ **ÉXITO COMPLETO**
```
📊 RESUMEN FINAL DE PRUEBAS E2E
✅ Pruebas exitosas: 10
❌ Pruebas fallidas: 0
📊 Total de pruebas: 10
📈 Tasa de éxito: 100.0%

🎉 ¡TODAS LAS PRUEBAS E2E FUNCIONALES PASARON EXITOSAMENTE!
```

### ⚠️ **FALLOS PARCIALES**
- Revisar `e2e-results.json` para detalles
- Verificar screenshots en `e2e-screenshots/`
- Comprobar logs de aplicación
- Validar configuración de red

## 🎯 Próximos Pasos

Una vez completadas las pruebas E2E:

1. **✅ Seguridad y estabilidad** → Completado
2. **✅ Pruebas funcionales E2E** → Completado
3. **🎉 CERTIFICACIÓN COMPLETA** → Grow5x listo para producción

---

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs en consola
2. Verificar conectividad de red
3. Comprobar estado del servidor
4. Contactar al equipo de desarrollo

**¡Grow5x está listo para el éxito! 🚀**