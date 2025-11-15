# Autenticación - Guía para Panel Admin

## Endpoints de Autenticación

### 1. Login (POST /api/admin/login)

Obtén un JWT token para acceder a endpoints protegidos.

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "username": "admin",
    "email": "admin@rifaplus.local"
  },
  "expiresIn": "24h"
}
```

### 2. Usar Token en Endpoints Protegidos

Incluye el token en el header `Authorization` como `Bearer <token>`:

```bash
curl -X GET http://localhost:3000/api/ordenes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Endpoints Protegidos

Los siguientes endpoints requieren autenticación (JWT):

- `GET /api/ordenes` — Lista todas las órdenes
- `GET /api/admin/stats` — Estadísticas del sistema
- `PATCH /api/ordenes/:id/estado` — Actualizar estado de orden
- `POST /api/admin/logout` — Cerrar sesión (opcional)

## Usuarios por Defecto

**Desarrollo:**
- Usuario: `admin`
- Contraseña: `admin123`

**IMPORTANTE:** Cambiar en producción.

## Configuración JWT

- **Expiración:** 24 horas
- **Secret Key:** Variable de entorno `JWT_SECRET` (ver `.env.example`)
- **Algoritmo:** HS256

## Cambiar Contraseña de Admin (En desarrollo)

```bash
# 1. Accede a la BD SQLite
sqlite3 backend/db/rifaplus.db

# 2. Genera un nuevo hash con bcryptjs
# Usa: npm run hash-password

# 3. Actualiza en la BD
UPDATE admin_users SET password_hash = '...' WHERE username = 'admin';
```

## Integración en Frontend

En `admin.html`, antes de acceder a ordenes:

```javascript
// Guardad el token al login
localStorage.setItem('rifaplus_token', response.token);

// Incluir token en fetch
fetch('/api/ordenes', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('rifaplus_token')}`
  }
});
```

## Tokens Expirados

Si recibes un error 403 `Token inválido o expirado`, vuelve a hacer login para obtener un nuevo token.

---

**Próximas mejoras:**
- Cambio de contraseña para usuario admin
- Múltiples usuarios con roles (admin, operador, reportes)
- OAuth/SSO integration
