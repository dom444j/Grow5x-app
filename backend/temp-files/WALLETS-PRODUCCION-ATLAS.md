# WALLETS DE PRODUCCIÓN - MONGODB ATLAS

## ⚠️ IMPORTANTE - SOLO USAR ESTAS WALLETS

Este proyecto está configurado para usar **ÚNICAMENTE** MongoDB Atlas en producción.
**NO crear scripts que generen wallets automáticamente.**

## WALLETS AUTORIZADAS (14 wallets)

Estas son las ÚNICAS wallets que deben existir en la base de datos:

```
0x0286d41599AcBdd0DA208a1712C607C2E0A536a7
0x5248e84A8b291f6af6Af2d03568127a3fe9a60A7
0x7d3AB28e1f499a378F5ce4696304FB1ec5f912ef
0x0CdBc5322613B6f93902aFa83895981214A77E38
0x05F72003de2B3FEbC7D0C47b80A1E4B30C88CBE6
0x528565f6407005Da7e95c3386591857e1BF2D584
0x2e489955dc32BF87c64369A2D114c6aE2049F6eE
0x2750969dd48674c1807DDC5f2E3e3A702725B0Ea
0xA1B15fF2aA6d9a8054A4140d9fbddB170b960E86
0x2D612a796dCD513D6414460878b71C0C2Ce95c52
0x850F1599ECC6d5f5D8683e4286D1f7c12092d026
0x78469fbEEd58e73a1DE40561f5f30c800155E2A9
0xA93f18bd619b8027C6df69D1CAC50eF81b68AF3c
0x21d79FE4123Cf2C0f8FA4111c3c1139678AB42E6
```

## SCRIPTS ELIMINADOS

Los siguientes scripts han sido eliminados para evitar confusiones:
- `seed-wallets.js` - Creaba wallets automáticamente
- `fix_wallets_atlas.js` - Script temporal que ya no es necesario
- `cleanup-wallets.js` - Script de limpieza obsoleto

## SCRIPTS DISPONIBLES

### ✅ Scripts Seguros para Usar:
- `check_wallets.js` - Verifica las wallets en MongoDB Atlas
- `cleanup_specific_wallets.js` - Mantiene solo las 14 wallets autorizadas

### ⚠️ Scripts que Requieren Atención:
Estos scripts tienen fallbacks a localhost que deben ser revisados:
- `scripts/activate-pending-users.js`
- `scripts/seed-admin-data.js`
- `scripts/verify-special-users.js`
- `scripts/migrate-special-users.js`
- `scripts/load-special-admin-users.js`
- `src/scripts/seedDocuments.js`

## CONFIGURACIÓN CORRECTA

### MongoDB Atlas (Producción)
```env
MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority
```

### ❌ NO USAR (Local)
```env
# MONGODB_URI=mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority
```

## COMANDOS ÚTILES

### Verificar wallets actuales:
```bash
node check_wallets.js
```

### Limpiar y mantener solo las 14 wallets autorizadas:
```bash
node cleanup_specific_wallets.js
```

## REGLAS IMPORTANTES

1. **NUNCA crear scripts que generen wallets automáticamente**
2. **SIEMPRE usar MongoDB Atlas (no localhost)**
3. **SOLO mantener las 14 wallets especificadas**
4. **Verificar conexión antes de ejecutar scripts**
5. **NO ejecutar scripts de seed-wallets**

## SISTEMA DE WALLETS MÚLTIPLES

El sistema está configurado para:
- ✅ Soportar múltiples pagos simultáneos
- ✅ Asignación aleatoria de wallets
- ✅ Sin restricciones de uso concurrente
- ✅ Todas las wallets siempre disponibles

---

**Última actualización:** $(date)
**Estado:** Producción con MongoDB Atlas
**Wallets activas:** 14