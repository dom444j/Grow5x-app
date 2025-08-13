# 🚀 Scripts de Optimización MongoDB - Grow5X

Este directorio contiene scripts especializados para optimizar la base de datos MongoDB del proyecto Grow5X, eliminando campos obsoletos, migrando datos duplicados y mejorando el rendimiento general.

## 📋 Scripts Disponibles

### 1. `analyze-unused-fields.js`
**Propósito**: Análisis completo de campos no utilizados en los modelos
- ✅ **Solo lectura** - No modifica datos
- 🔍 Identifica campos sin referencias en el código
- 📊 Analiza uso en base de datos
- 📄 Genera reporte detallado en JSON

```bash
node backend/scripts/analyze-unused-fields.js
```

### 2. `migrate-duplicated-fields.js`
**Propósito**: Migración de campos duplicados entre User y UserStatus
- 🔄 Sincroniza datos entre modelos
- 🆕 Crea UserStatus faltantes
- 🔧 Corrige inconsistencias
- ✅ Valida integridad post-migración

```bash
node backend/scripts/migrate-duplicated-fields.js
```

### 3. `cleanup-obsolete-fields.js`
**Propósito**: Eliminación de campos obsoletos identificados
- 🗑️ Elimina campos no utilizados
- 💾 Crea backup automático
- 📊 Analiza impacto antes de eliminar
- ✅ Valida integridad post-limpieza

```bash
node backend/scripts/cleanup-obsolete-fields.js
```

### 4. `optimize-mongodb.js` ⭐
**Propósito**: Script maestro que ejecuta todo el proceso de optimización
- 🎯 Ejecuta todos los scripts en orden correcto
- 🔍 Verifica prerrequisitos
- 📊 Estima recursos necesarios
- 📄 Genera reporte final completo

```bash
node backend/scripts/optimize-mongodb.js
```

## 🛡️ Medidas de Seguridad

### Antes de Ejecutar
1. **Backup Completo**: Los scripts crean backups automáticos, pero se recomienda backup manual adicional
2. **Entorno de Testing**: Ejecutar primero en entorno de desarrollo/testing
3. **Verificar Conexión**: Asegurar conexión estable a MongoDB
4. **Revisar Logs**: Monitorear logs durante y después de la ejecución

### Variables de Entorno Requeridas
```env
MONGODB_URI=mongodb://localhost:27017/grow5x
NODE_ENV=development
```

## 📊 Reportes Generados

Cada script genera reportes detallados:

- `analysis-unused-fields-report.json` - Análisis de campos no utilizados
- `migrate-duplicated-fields-report.json` - Resultado de migración
- `cleanup-obsolete-fields-report.json` - Resultado de limpieza
- `mongodb-optimization-final-report.json` - Reporte final completo

## 🔄 Flujo Recomendado

### Opción 1: Ejecución Manual por Fases
```bash
# Fase 1: Análisis inicial
node backend/scripts/analyze-unused-fields.js

# Revisar reporte generado
cat backend/analysis-unused-fields-report.json

# Fase 2: Migración de duplicados
node backend/scripts/migrate-duplicated-fields.js

# Fase 3: Limpieza de obsoletos
node backend/scripts/cleanup-obsolete-fields.js
```

### Opción 2: Ejecución Automatizada (Recomendada)
```bash
# Ejecuta todo el proceso de optimización
node backend/scripts/optimize-mongodb.js
```

## ⚠️ Consideraciones Importantes

### Campos Identificados para Optimización

#### 🗑️ Campos a Eliminar
- **User.investments**: Campos de inversión no implementados
- **User.activity**: Contadores que se pueden calcular dinámicamente
- **Transaction.pioneerPlan**: Campos de plan pioneer no utilizados
- **Transaction.invoiceId**: Campo de facturación no implementado
- **Package.commissionConfig**: Configuraciones no implementadas

#### 🔄 Campos Duplicados (User ↔ UserStatus)
- `package_status` ↔ `subscription.packageStatus`
- `current_package` ↔ `subscription.currentPackage`
- `isPioneer` ↔ `pioneer.isActive`
- `balance` ↔ `financial.currentBalance`
- `totalEarnings` ↔ `financial.totalEarnings`

### Impacto Esperado

#### 📈 Beneficios
- **Reducción de tamaño**: 15-25% menos espacio en disco
- **Mejora de rendimiento**: 10-20% en consultas complejas
- **Consistencia de datos**: Eliminación de duplicados
- **Mantenibilidad**: Esquemas más limpios y claros

#### ⚡ Riesgos
- **Pérdida de datos**: Si hay campos mal identificados como obsoletos
- **Errores de aplicación**: Si el código referencia campos eliminados
- **Tiempo de inactividad**: Durante la migración de datos grandes

## 🔧 Configuración Avanzada

### Modo Dry Run
Para simular sin hacer cambios:

```javascript
// En optimize-mongodb.js
const OPTIMIZATION_CONFIG = {
  safety: {
    dryRun: true // Solo simular
  }
};
```

### Configuración de Seguridad
```javascript
const OPTIMIZATION_CONFIG = {
  safety: {
    createBackups: true,
    requireConfirmation: true, // Pedir confirmación
    maxDocumentsToProcess: 10000 // Límite de seguridad
  }
};
```

## 🆘 Solución de Problemas

### Error: "Schema hasn't been registered"
```bash
# Asegurar que los modelos están correctamente importados
# Verificar conexión a MongoDB
# Revisar variables de entorno
```

### Error: "Permission denied"
```bash
# Verificar permisos de escritura en directorio
chmod +w backend/scripts/
chmod +w backend/backups/
```

### Error: "Connection timeout"
```bash
# Verificar conexión a MongoDB
# Aumentar timeout en configuración
# Verificar firewall/red
```

## 📞 Soporte

Para problemas o dudas:
1. Revisar logs detallados en consola
2. Verificar reportes JSON generados
3. Consultar documentación en `ANALISIS-OPTIMIZACION-MONGODB.md`
4. Contactar al equipo de desarrollo

## 🔄 Rollback

En caso de problemas:
1. Los backups se crean automáticamente en `backend/backups/`
2. Restaurar desde backup más reciente
3. Verificar integridad de datos
4. Reiniciar servicios de aplicación

```bash
# Ejemplo de restauración
mongorestore --db grow5x backend/backups/cleanup-backup-[timestamp].json
```

---

**⚠️ IMPORTANTE**: Siempre ejecutar en entorno de testing antes de producción y mantener backups actualizados.

**📅 Última actualización**: $(date)
**👨‍💻 Mantenido por**: Equipo de Desarrollo Grow5X