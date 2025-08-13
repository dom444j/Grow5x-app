🆔 ID extraído del registro: 68986c4595176a7d299d264e
🔍 Buscando usuario en BD...
👤 Usuario encontrado por email: {
  found: true,
  id: '68986c4595176a7d299d264e',
  email: 'userb+1754819622502+2c44@test.com',
  status: 'pending',
  isActive: undefined
}
👤 Usuario encontrado por ID: {
  found: true,
  id: '68986c4595176a7d299d264e',
  email: 'userb+1754819622502+2c44@test.com',
  status: 'pending',
  isActive: undefined
}
📝 Resultado actualización por email: { matchedCount: 1, modifiedCount: 1 }
👤 Usuario después de actualización: {
  email: 'userb+1754819622502+2c44@test.com',
  status: 'active',
  isActive: true,
  emailVerified: true,
  verificationIsVerified: true
}
🔐 Intentando login con: userb+1754819622502+2c44@test.com
🔍 Login response structure: {
  "ok": true,
  "status": 200,
  "data": {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "68986c4595176a7d299d264e",
        "email": "userb+1754819622502+2c44@test.com",
        "telegram": {
          "isVerified": false
        },
        "fullName": "Test User B",
        "country": "ES",
        "referralCode": "4V4EM4RZ",
        "role": "user",
        "status": "active",
        "isPioneer": false,
        "capital": 0,
        "lastLogin": "2025-08-10T09:54:23.232Z",
        "isSpecialUser": false,
        "isEmailVerified": false,
        "isTelegramVerified": false
      },
      "tokens": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODk4NmM0NTk1MTc2YTdkMjk5ZDI2NGUiLCJpYXQiOjE3NTQ4MTk2NjMsImV4cCI6MTc1NTQyNDQ2M30.1qHcc4XRXX_hdovBsewN_lbN-7C4ZjTxXX3q_pwP99Y",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODk4NmM0NTk1MTc2YTdkMjk5ZDI2NGUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc1NDgxOTY2MywiZXhwIjoxNzU3NDExNjYzfQ.B_Tf2MM_62zuIqBLhmIZkAzITcE_VaBc6wWJ4-KsSv0",
        "expiresIn": "15m"
      }
    }
  }
}
🔍 result.ok: true
🔍 result.data: {
  success: true,
  message: 'Login successful',
  data: {
    user: {
      id: '68986c4595176a7d299d264e',
      email: 'userb+1754819622502+2c44@test.com',
      telegram: [Object],
      fullName: 'Test User B',
      country: 'ES',
      referralCode: '4V4EM4RZ',
      role: 'user',
      status: 'active',
      isPioneer: false,
      capital: 0,
      lastLogin: '2025-08-10T09:54:23.232Z',
      isSpecialUser: false,
      isEmailVerified: false,
      isTelegramVerified: false
    },
    tokens: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODk4NmM0NTk1MTc2YTdkMjk5ZDI2NGUiLCJpYXQiOjE3NTQ4MTk2NjMsImV4cCI6MTc1NTQyNDQ2M30.1qHcc4XRXX_hdovBsewN_lbN-7C4ZjTxXX3q_pwP99Y',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODk4NmM0NTk1MTc2YTdkMjk5ZDI2NGUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc1NDgxOTY2MywiZXhwIjoxNzU3NDExNjYzfQ.B_Tf2MM_62zuIqBLhmIZkAzITcE_VaBc6wWJ4-KsSv0',
      expiresIn: '15m'
    }
  }
}
🔍 result.data.data.tokens: {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODk4NmM0NTk1MTc2YTdkMjk5ZDI2NGUiLCJpYXQiOjE3NTQ4MTk2NjMsImV4cCI6MTc1NTQyNDQ2M30.1qHcc4XRXX_hdovBsewN_lbN-7C4ZjTxXX3q_pwP99Y',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODk4NmM0NTk1MTc2YTdkMjk5ZDI2NGUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc1NDgxOTY2MywiZXhwIjoxNzU3NDExNjYzfQ.B_Tf2MM_62zuIqBLhmIZkAzITcE_VaBc6wWJ4-KsSv0',
  expiresIn: '15m'
}
✅ Token set successfully: eyJhbGciOiJIUzI1NiIs...
🔧 Usuario logueado con status: active
🎫 Resultado login: { ok: true, hasData: true }
✅ Token extraído exitosamente
🔗 Procesando referral manualmente para User B...
📧 Email a procesar: userb+1754819622502+2c44@test.com
📊 Resultado completo del referral: {
  "ok": true,
  "status": 200,
  "data": {
    "success": true,
    "message": "Referral record already exists",
    "referral": {
      "directCommission": {
        "rate": 0.1,
        "earned": 0,
        "paid": 0,
        "cashbackCompleted": false
      },
      "specialBonuses": {
        "leaderBonus": {
          "rate": 0.05,
          "earned": 0,
          "paid": 0,
          "secondCycleCompleted": false
        },
        "parentBonus": {
          "rate": 0.05,
          "earned": 0,
          "paid": 0,
          "secondCycleCompleted": false
        }
      },
      "performance": {
        "directReferralsCount": 0,
        "activeReferralsCount": 0,
        "conversionRate": 0,
        "averageReferralValue": 0,
        "totalDirectCommissions": 0
      },
      "referredActivity": {
        "totalDeposits": 0,
        "totalEarnings": 0
      },
      "_id": "68986c4695176a7d299d2652",
      "referrer": "68986c3195176a7d299d25bb",
      "referred": "68986c4595176a7d299d264e",
      "referralCode": "8X2FUEVC",
      "status": "pending",
      "commissionRate": 0.1,
      "commissionAmount": 0,
      "commissionPaid": 0,
      "commissionCurrency": "USDT",
      "level": 1,
      "source": "registration",
      "commissionHistory": [],
      "expiresAt": "2025-11-08T09:54:14.511Z",
      "createdAt": "2025-08-10T09:54:14.511Z",
      "updatedAt": "2025-08-10T09:54:14.511Z",
      "__v": 0
    }
  }
}
✅ Referral procesado exitosamente
✅ Registro User B (Referido) - PASS

🧪 Compra Package User B
✅ Compra Package User B - PASS

🧪 Confirmar Pago User B
✅ Confirmar Pago User B - PASS

🧪 Procesar Beneficios Día 1 - User B
✅ Procesar Beneficios Día 1 - User B - PASS

🧪 Procesar Beneficios Día 2 - User B
✅ Procesar Beneficios Día 2 - User B - PASS

🧪 Procesar Beneficios Día 3 - User B
✅ Procesar Beneficios Día 3 - User B - PASS

🧪 Procesar Beneficios Día 4 - User B
✅ Procesar Beneficios Día 4 - User B - PASS

🧪 Procesar Beneficios Día 5 - User B
✅ Procesar Beneficios Día 5 - User B - PASS

🧪 Procesar Beneficios Día 6 - User B
✅ Procesar Beneficios Día 6 - User B - PASS

🧪 Procesar Beneficios Día 7 - User B
✅ Procesar Beneficios Día 7 - User B - PASS

🧪 Procesar Beneficios Día 8 - User B
✅ Ciclo de cashback User B completado (día 8)
✅ Procesar Beneficios Día 8 - User B - PASS

🧪 Verificar Comisión Directa 10%
📊 Resultado del trigger de comisión: {
  "ok": true,
  "status": 200,
  "data": {
    "success": true,
    "message": "Comisiones directas procesadas exitosamente",   
    "data": {
      "success": true,
      "processedCount": 1,
      "commissions": [
        {
          "created": false,
          "reason": "no_completed_purchases"
        }
      ]
    }
  }
}
❌ Verificar Comisión Directa 10% - FAIL: No se encontró comisión directa después del trigger

🧪 Procesar Daily Benefits Admin
❌ Procesar Daily Benefits Admin - FAIL: Daily benefits falló: {"success":false,"message":"Error en procesamiento masivo","error":"Cannot read properties of null (reading '_id')"}

🧪 Procesar Pool Admin Biweekly
⚠️ Pool admin biweekly no disponible - simulando manualmente
✅ Pool admin biweekly procesado (día 17)
✅ Procesar Pool Admin Biweekly - PASS

🧪 Verificar Índices Anti-Duplicado
✅ Índice anti-duplicado verificado
✅ Verificar Índices Anti-Duplicado - PASS

📊 Reporte generado: REPORTE-SMOKE-TEST-E2E-OPTIMIZED.md        
🎯 Tasa de Éxito: 92.9%

⚠️  Smoke Test requiere atención antes de producción.
(TraeAI-6) C:\Users\DOM\Desktop\growx5-app\backend [1:1] $ 
(TraeAI-6) C:\Users\DOM\Desktop\growx5-app\backend [1:1] $ Get-Content logs/combined.log | Select-String -Pattern "Cannot read properties of null" -Context 5 | Select-Object -Last 10
(TraeAI-6) C:\Users\DOM\Desktop\growx5-app\backend [0:1] $ 
(TraeAI-6) C:\Users\DOM\Desktop\growx5-app\backend [0:1] $ 