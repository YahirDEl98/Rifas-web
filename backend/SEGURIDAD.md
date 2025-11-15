# Seguridad - Documentación RifaPlus

## Medidas de Seguridad Implementadas

### 1. **Headers de Seguridad HTTP (Helmet)**
- CSP (Content Security Policy)
- X-Frame-Options (previene clickjacking)
- X-Content-Type-Options (previene MIME sniffing)
- Strict-Transport-Security (HTTPS enforcement)

### 2. **Rate Limiting**

**Limitador General:**
- Límite: 100 requests por 15 minutos
- Aplica a todas las rutas
- Devuelve error 429 si se excede

**Limitador Login:**
- Límite: 5 intentos por 15 minutos
- Solo cuenta intentos fallidos
- Protege contra fuerza bruta

**Limitador Órdenes:**
- Límite: 10 órdenes por minuto por IP
- Previene spam de órdenes
- Por dirección IP del cliente

### 3. **Sanitización de Inputs**

Todos los strings se sanitizan con `sanitize-html`:
- Elimina HTML tags maliciosos
- Previene XSS (Cross-Site Scripting)
- Trimea espacios en blanco

**Campos sanitizados:**
- `ordenId`
- `nombre`, `apellidos`, `email`, `whatsapp` del cliente
- `metodoPago`
- `detalles_pago`
- `notas`

### 4. **Autenticación JWT**
- Token expira en 24 horas
- Secret key desde variable de entorno (CAMBIAR EN PRODUCCIÓN)
- Protege endpoints críticos: `/api/ordenes`, `/api/admin/stats`, `/api/ordenes/:id/estado`

### 5. **Validaciones Exhaustivas**

#### Email
- Regex: `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- Requerido para toda orden

#### Teléfono
- Largo: 10-20 caracteres
- Requerido para contacto cliente

#### Cantidad de Boletos
- Mínimo: 1
- Máximo: 100
- Debe ser entero

#### Precios
- Deben ser números positivos
- Validación en subtotal, descuento, total

#### Orden ID
- Largo: 1-50 caracteres
- No puede ser duplicado en BD

### 6. **Logging**
Se registran eventos importantes:
- Intentos de login (exitosos y fallidos)
- Órdenes creadas
- Errores del sistema
- Intentos de acceso sin autenticación

Formato:
```
[2025-11-15T22:42:28.000Z] [INFO] Login exitoso { username: 'admin', ip: '::1' }
[2025-11-15T22:42:28.000Z] [WARN] Intento de orden duplicada { ordenId: 'ORD-001', ip: '::1' }
[2025-11-15T22:42:28.000Z] [ERROR] POST /api/ordenes error { error: 'Database connection failed' }
```

## Casos Edge y Manejo

### Entrada Vacía
```javascript
if (nombre.length === 0) {
    return res.status(400).json({ success: false, message: 'Nombre requerido' });
}
```

### Valores Nulos/Undefined
```javascript
const sanitized = sanitizar(orden.cliente.nombre || '');
```

### Inyección SQL
Protegido por Knex (prepared statements)

### XSS
Sanitización de todos los strings de entrada

### CSRF
CORS configurado, tokens JWT para protección

### Fuerza Bruta (Login)
Rate limiting específico: 5 intentos cada 15 minutos

### Spam de Órdenes
Rate limiting: 10 órdenes por minuto

### Órdenes Duplicadas
Validación de `numero_orden` único en BD

### Valores Negativos
Validación de precios: deben ser positivos

### Boletos Inválidos
- Cantidad: 1-100
- Array: debe ser array válido
- Números: enteros positivos

## Variables de Entorno (Seguridad)

```bash
# .env (NUNCA subir a Git)
NODE_ENV=production
JWT_SECRET=tu-secret-key-super-seguro-128-caracteres-minimo
PORT=3000
DATABASE_URL=postgresql://user:pass@host/db  # Para producción
```

**En .gitignore:**
```
.env
.env.*.local
db/*.db
db/*.sqlite
```

## Mejoras Futuras

1. **HTTPS Obligatorio** - Usar certificados SSL/TLS
2. **CORS más restrictivo** - Especificar origen en producción
3. **Winston/Pino** - Logger profesional con rotación de logs
4. **OAuth/SSO** - Integración con proveedores (Google, GitHub)
5. **2FA** - Autenticación de dos factores para admin
6. **Auditoría** - Tabla para registrar cambios de órdenes
7. **API Keys** - Para integraciones con terceros
8. **Rate Limiting Dinámico** - Basado en usuario, no solo IP

## Testing de Seguridad

### Probar Rate Limiting
```bash
# Hacer >5 requests de login rápido
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/admin/login \
    -d '{"username":"admin","password":"wrong"}' &
done
```

### Probar Sanitización
```bash
curl -X POST http://localhost:3000/api/ordenes \
  -d '{"ordenId":"<script>alert(1)</script>", ...}'
```

### Probar Validaciones
```bash
# Email inválido
curl -X POST http://localhost:3000/api/ordenes \
  -d '{"cliente":{"email":"not-an-email"}, ...}'

# Boletos excedidos
curl -X POST http://localhost:3000/api/ordenes \
  -d '{"boletos":[...] /* 150 boletos */}'
```

## Checklist Pre-Producción

- [ ] JWT_SECRET configurado (mínimo 128 caracteres)
- [ ] NODE_ENV=production
- [ ] HTTPS habilitado
- [ ] CORS restringido a dominio específico
- [ ] Backups automáticos de BD
- [ ] Logs guardados en archivo (no solo console)
- [ ] Monitoreo de errores (Sentry, Rollbar, etc.)
- [ ] Rate limiting ajustado según carga
- [ ] Contrasena admin cambiada
- [ ] `.env` NO está en Git
- [ ] BD encriptada/protegida

---

**Versión:** 2.2
**Última actualización:** 15 de noviembre de 2025
