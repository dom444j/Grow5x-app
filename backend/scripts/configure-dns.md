# Configuración DNS para PrivateEmail en Namecheap

## Credenciales
- **Namecheap Usuario:** grow5x
- **Namecheap Contraseña:** POFsSeGyCasw9D9
- **PrivateEmail Contraseña:** 300400Jd14

## Dominios configurados
- noreply@grow5x.app
- recovery@grow5x.app
- support@grow5x.app
- welcome@grow5x.app

## Pasos para configurar DNS

### 1. Acceder a Namecheap
1. Ir a https://www.namecheap.com/
2. Login con: grow5x / POFsSeGyCasw9D9
3. Ir a "Domain List" → "Manage" para grow5x.app
4. Ir a "Advanced DNS"

### 2. Configurar registros MX (si no están)
```
Type: MX Record
Host: @
Value: mail.privateemail.com
Priority: 10
TTL: Automatic
```

### 3. Configurar registro SPF
```
Type: TXT Record
Host: @
Value: v=spf1 include:mail.privateemail.com ~all
TTL: Automatic
```

### 4. Configurar registro DMARC
```
Type: TXT Record
Host: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:noreply@grow5x.app
TTL: Automatic
```

### 5. Configurar DKIM en PrivateEmail
1. Ir a https://privateemail.com/
2. Login con cualquier correo (ej: noreply@grow5x.app) / 300400Jd14
3. Ir a Settings → Security → DKIM
4. Generar clave DKIM
5. Copiar el registro TXT que genere

### 6. Agregar registro DKIM en Namecheap
```
Type: TXT Record
Host: [selector]._domainkey (lo proporciona PrivateEmail)
Value: [clave DKIM que genere PrivateEmail]
TTL: Automatic
```

## Verificación

### Verificar registros DNS
```bash
# Verificar MX
nslookup -type=MX grow5x.app

# Verificar SPF
nslookup -type=TXT grow5x.app

# Verificar DMARC
nslookup -type=TXT _dmarc.grow5x.app

# Verificar DKIM (después de configurar)
nslookup -type=TXT [selector]._domainkey.grow5x.app
```

### Test de correo
Después de configurar (esperar 24-48h para propagación DNS):
1. Usar el endpoint `/api/auth/test-email` del backend
2. Verificar que los correos lleguen sin ir a spam
3. Verificar headers de autenticación (SPF, DKIM, DMARC)

## Notas importantes
- Los cambios DNS pueden tardar hasta 48 horas en propagarse
- Verificar que no haya registros conflictivos
- Mantener backup de configuración DNS actual
- Probar envío de correos después de la propagación

## Troubleshooting

### Si los correos van a spam:
1. Verificar que todos los registros estén correctos
2. Verificar reputación del dominio
3. Usar herramientas como mail-tester.com
4. Verificar contenido de los correos (evitar palabras spam)

### Si no se pueden enviar correos:
1. Verificar credenciales SMTP
2. Verificar registros MX
3. Verificar que el puerto 587 esté abierto
4. Verificar logs del backend