Perfecto. Tomé lo esencial de lo que ya acordamos en z-Chat-GPT y lo unifiqué en un único checklist operativo, claro y medible, sin romper el login ni duplicar /api.

Objetivo

- Mantener el login funcionando, eliminar 404/502 en /api, y asegurar un despliegue estable: frontend estático servido por Nginx y backend Node/Express en 127.0.0.1:5000 detrás de /api.
- Evitar la duplicación /api/api en el frontend y silenciar sockets si no hay servidor socket.io en producción.
Contexto clave de tu repo (solo referencia)

- Backend (Express) con rutas bajo /api en `server.js` .
- Frontend usa VITE_API_URL (debe ser /api en prod) y algunos servicios agregan /api manualmente.
  - Revisar y ajustar: `publicKpis.service.js` (evitar doble /api). [HECHO]
  - Base única: `api.js` define la base de API correctamente.
- Variables de entorno de producción:
  - Backend: `.env.production` (PORT=5000, API_URL= https://grow5x.app/api , FRONTEND_URL= https://grow5x.app ).
  - Frontend: `.env.production` (VITE_API_URL=/api, VITE_APP_URL= https://grow5x.app ).
- Nginx esperado (proxy /api a 127.0.0.1:5000/):
  - Archivos de referencia: `nginx-config-fixed.conf` , `nginx-simple.conf` , `nginx-temp.conf` .

Progreso
- Fase 5 (ajuste de frontend para evitar /api/api en KPIs públicos): [HECHO]
- Fase 1–4 (auditoría VPS, PM2, Nginx y pruebas E2E mínimas): [HECHO]
- Fix definitivo login admin/usuarios (404 en /api/auth/login): [HECHO]
- Resto de fases: [PENDIENTE]

Checklist por fases (con resultados esperados)

Fase 0 — Acceso y seguridad

- Confirmar acceso SSH al VPS (con tu key) y no tocar JWT ni credenciales en producción.
- Asegurar que no se cambian puertos ni se reinician servicios “a ciegas”.
Fase 1 — Auditoría rápida del VPS sin romper login

- Puertos y procesos en escucha (80/443/5000), estado de PM2:
  - ss -ltnp | egrep ':5000|:80|:443' || true
  - pm2 ls
- Health backend local y público:
  - curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5000/api/health (Esperado 200)
  - curl -s -o /dev/null -w '%{http_code}\n' https://grow5x.app/api/health (Esperado 200)
- Nginx activo para grow5x.app:
  - grep -Rni 'server_name .*grow5x.app' /etc/nginx/sites-enabled /etc/nginx/sites-available || true
  - sed -n '1,200p' /etc/nginx/sites-available/grow5x.app
Evidencia a capturar: salida de los comandos anteriores.

Fase 2 — Backend estable en 5000 (un solo proceso PM2)

- Verificar PORT=5000 en /var/www/grow5x/backend/.env.production (no tocar claves).
- Arrancar/recargar sin duplicar:
  - cd /var/www/grow5x/backend
  - pm2 startOrReload ecosystem.config.js --env production
- Revalidar health local:
  - curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5000/api/health (Esperado 200)
Evidencia a capturar: pm2 ls, código 200.

Fase 3 — Nginx sin ambigüedades (sin /api duplicado)

- Server block debe servir dist y proxyear /api:
  - root /var/www/grow5x/frontend/dist;
  - location /api/ { proxy_pass http://127.0.0.1:5000/ ; ... }
  - location / { try_files $uri $uri/ /index.html; }
- Validar y recargar:
  - nginx -t && systemctl reload nginx
- (Opcional) Habilitar IPv6 si aplica:
  - listen [::]:80; y listen [::]:443 ssl http2; en el server_name grow5x.app
  - Ajustar firewall si hay.
Evidencia a capturar: nginx -t ok, extracto de server block.

Fase 4 — Pruebas E2E mínimas (no omitir)

- curl -i http://127.0.0.1:5000/api/health | head -n1 (Esperado HTTP/1.1 200)
- curl -i https://grow5x.app/api/health | head -n1 (Esperado HTTP/2 200)
- curl -i -X POST https://grow5x.app/api/auth/login -H 'Content-Type: application/json' -d '{"identifier":"x","password":"y","userType":"user"}' | head -n1 (Esperado 400; confirma ruta viva)
- Probar login real desde el navegador (Esperado 200 con credenciales válidas).
Si algo difiere, capturar:

- pm2 logs --lines 120
- tail -n 120 /var/log/nginx/access.log
- tail -n 120 /var/log/nginx/error.log
Fase 5 — Ajustes mínimos de frontend (seguros)

- Mantener en prod VITE_API_URL=/api en `.env.production` .
- Unificar construcción de URL para evitar /api/api:
  - En `publicKpis.service.js` cambiar fetch de ${VITE_API_URL}/api/public/kpis a ${VITE_API_URL}/public/kpis . [HECHO]
  - Verificar en `api.js` que la base es import.meta.env.VITE_API_URL o ' http://localhost:3000/api ' y que los endpoints hijos no vuelven a anteponer /api.
- WebSockets:
  - Si no hay socket.io en backend, poner bajo flag o usar VITE_WS_URL vacío en prod y no conectar en producción. [HECHO]
Fase 6 — Seguridad y saneamiento

- Revisar que no haya URIs o credenciales de Atlas en scripts públicos del repo.
- Confirmar CORS del backend con FRONTEND_URL= https://grow5x.app en `.env.production` .
- No exponer .env del frontend con secretos (solo VITE_ públicos).
Fase 7 — Gestión manual (pendiente, si lo deseas)

- Diseñar e implementar endpoints admin mínimos en /api/admin/*:
  - PATCH users/:id/verify {verified}
  - PATCH users/:id/status {status}
  - POST users/:id/packages/assign {packageSlug, amount?, notes?}
  - POST commissions/direct {sponsorId, fromUserId, purchaseId, amount?}
  - PATCH commissions/:id/pay {paymentMethod, notes?, txHash?} y PATCH commissions/:id/cancel {reason}
- Exponer acciones en panel admin (users y finance).
Fase 8 — Smoke tests post-deploy

- Health 200 público
- Login 400 con dummy
- Flujo de login real OK
- Pruebas de endpoints admin (si los implementas) con token admin
Bloque consolidado (para ejecutar en el VPS, seguro y sin cambiar puertos/JWT)

- ss -ltnp | egrep ':5000|:80|:443' || true
- pm2 ls
- curl -s -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:5000/api/health || true
- curl -s -o /dev/null -w '%{http_code}\\n' https://grow5x.app/api/health || true
- cd /var/www/grow5x/backend && grep -E '^(PORT|NODE_ENV)=' .env.production
- pm2 startOrReload ecosystem.config.js --env production
- sleep 2
- curl -s -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:5000/api/health
- Verifica server block Nginx para grow5x.app con:
  - sed -n '1,200p' /etc/nginx/sites-available/grow5x.app
  - Debe contener: root /var/www/grow5x/frontend/dist; y location /api/ { proxy_pass http://127.0.0.1:5000/ ; ... }
- nginx -t && systemctl reload nginx
- curl -i http://127.0.0.1:5000/api/health | head -n1
- curl -i https://grow5x.app/api/health | head -n1
- curl -i -X POST https://grow5x.app/api/auth/login -H 'Content-Type: application/json' -d '{"identifier":"x","password":"y","userType":"user"}' | head -n1
- Si falla: pm2 logs --lines 120; tail -n 120 /var/log/nginx/error.log
Criterios de aceptación (listo para dar por cerrado)

- Health local y público devuelven 200.
- Login con credenciales inválidas devuelve 400 (ruta viva).
- Login con credenciales válidas funciona desde navegador.
- No hay /api duplicado en ninguna llamada del frontend.
- Un solo proceso backend en PM2 escuchando 127.0.0.1:5000.
- Nginx probado y recargado sin errores.
## SOLUCIÓN DEFINITIVA IMPLEMENTADA

### Problema identificado
- POST https://grow5x.app/api/auth/login devolvía 404 (Route not found)
- Las sesiones se perdían cada vez que se subían nuevos datos
- Nginx no redirigía correctamente las peticiones /api al backend

### Script de solución creado: `fix-login-definitivo.sh`

**Uso en el VPS:**
```bash
# Copiar el script al VPS y ejecutar como root
scp fix-login-definitivo.sh root@tu-vps:/root/
ssh root@tu-vps
chmod +x /root/fix-login-definitivo.sh
bash /root/fix-login-definitivo.sh
```

**Lo que corrige:**
1. **Nginx proxy_pass correcto**: `location ^~ /api/ { proxy_pass http://127.0.0.1:5000; }` (sin barra final para preservar /api)
2. **Backend estable**: PM2 startOrReload con ecosystem.config.js en modo producción
3. **Sesiones preservadas**: No modifica JWT_SECRET ni credenciales
4. **Validación completa**: Tests de health local/público y login endpoint

**Resultado esperado:**
- ✅ https://grow5x.app/api/health → 200 OK
- ✅ https://grow5x.app/api/auth/login → 400/401 (ruta viva, no 404)
- ✅ Login real con credenciales válidas funciona
- ✅ Sesiones estables tras deploys

**Para uso futuro:** Ejecutar `bash fix-login-definitivo.sh` después de cada deploy para mantener la configuración estable.