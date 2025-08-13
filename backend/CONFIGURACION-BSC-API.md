# Configuración de API Key de BSCScan

## Problema Identificado

El paso 3 del proceso de compra (verificación de transacciones BSC) está fallando porque:

1. **Falta la API Key de BSCScan**: El archivo `.env` no tenía configurada la variable `BSCSCAN_API_KEY`
2. **Manejo de errores inadecuado**: El servicio BEP20 no manejaba correctamente los errores de API key faltante
3. **Lógica de verificación incorrecta**: El controlador usaba Web3 para transacciones BNB nativas en lugar del servicio BEP20 para USDT

## Correcciones Aplicadas

### 1. Configuración de Variables de Entorno

```bash
# Agregado al archivo .env
BSCSCAN_API_KEY=YourBSCScanAPIKeyHere
```

### 2. Mejoras en el Servicio BEP20

- **Validación de API Key**: Agregada verificación en el constructor
- **Manejo de errores mejorado**: El método `weiToUsdt()` ahora maneja errores de API key
- **Logging mejorado**: Mensajes de advertencia cuando la API key no está configurada

### 3. Corrección del Controlador de Pagos

- **Uso del servicio BEP20**: Reemplazada la lógica Web3 con el servicio especializado
- **Verificación de configuración**: Validación previa de la API key
- **Manejo de errores específicos**: Mensajes de error más descriptivos

## Pasos para Obtener una API Key Real

### 1. Registrarse en BSCScan

1. Ir a [https://bscscan.com/](https://bscscan.com/)
2. Hacer clic en "Sign In" y luego "Click to sign up"
3. Completar el registro con email y contraseña
4. Verificar el email

### 2. Generar API Key

1. Iniciar sesión en BSCScan
2. Ir a "My Account" > "API Keys"
3. Hacer clic en "Add" para crear una nueva API key
4. Darle un nombre descriptivo (ej: "GrowX5-Production")
5. Copiar la API key generada

### 3. Configurar en el Proyecto

```bash
# Reemplazar en el archivo .env
BSCSCAN_API_KEY=TU_API_KEY_REAL_AQUI
```

### 4. Reiniciar el Servidor

```bash
# Detener el servidor actual
Ctrl+C

# Reiniciar el servidor
npm run dev
```

## Verificación del Funcionamiento

### 1. Logs del Servidor

Al iniciar el servidor, NO debería aparecer el mensaje:
```
BSCSCAN_API_KEY not configured properly. BSC transaction verification will fail.
```

### 2. Prueba de Transacción

1. Realizar una transacción USDT BEP20 real
2. Usar el hash de transacción en el paso 3
3. Verificar que la transacción se valide correctamente

### 3. Logs de Verificación

En caso de éxito, debería aparecer:
```
BSC BEP20 transaction verified successfully
```

## Límites de la API Gratuita

- **BSCScan API Gratuita**: 5 llamadas por segundo, 100,000 llamadas por día
- **Para producción**: Considerar el plan Pro si se necesitan más llamadas

## Troubleshooting

### Error: "Invalid API Key"
- Verificar que la API key esté correctamente copiada
- Asegurarse de que no haya espacios extra
- Verificar que la API key esté activa en BSCScan

### Error: "Rate limit exceeded"
- Esperar un momento antes de intentar nuevamente
- Considerar implementar rate limiting en el frontend
- Evaluar upgrade a plan Pro de BSCScan

### Error: "Transaction not found"
- Verificar que el hash de transacción sea correcto
- Asegurarse de que la transacción esté confirmada en la blockchain
- Verificar que sea una transacción USDT BEP20

## Monitoreo

### Logs a Revisar

```bash
# Ver logs en tiempo real
tail -f backend/logs/error.log
tail -f backend/logs/combined.log
```

### Métricas Importantes

- Número de verificaciones exitosas vs fallidas
- Tiempo de respuesta de la API de BSCScan
- Errores de rate limiting

## Próximos Pasos

1. **Obtener API Key real** de BSCScan
2. **Configurar en producción** con variables de entorno seguras
3. **Implementar monitoreo** de la salud de la API
4. **Considerar fallbacks** en caso de falla de BSCScan
5. **Documentar procedimientos** de mantenimiento

---

**Nota**: Una vez configurada la API key real, el paso 3 del proceso de compra debería funcionar correctamente para verificar transacciones USDT BEP20 en la red BSC.