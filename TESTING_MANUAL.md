# Testing Manual - Checklist

**Fecha:** 15 de noviembre de 2025  
**Versión:** 2.2

---

## 🔧 Setup Previo

```bash
# Terminal 1: Backend
cd backend
node server.js

# Terminal 2: Frontend
cd /path/to/rifas-web
python3 -m http.server 8080
```

**URLs:**
- Frontend: http://localhost:8080/
- Admin panel: http://localhost:8080/admin-v2.html
- API: http://localhost:3000/

---

## ✅ Tests Manuales

### 1. Base de Datos
- [ ] BD existe en `backend/db/rifaplus.db`
- [ ] Tablas `ordenes` y `admin_users` existen
- [ ] Usuario admin existe con contraseña hasheada

```bash
sqlite3 backend/db/rifaplus.db "SELECT * FROM admin_users;"
```

### 2. Health Check
- [ ] GET http://localhost:3000 devuelve JSON con version y seguridad

```bash
curl http://localhost:3000 | jq .
```

### 3. Autenticación

#### Login Correcto
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
- [ ] Devuelve código 200
- [ ] Contiene `token`, `usuario`, `expiresIn`
- [ ] Token es válido JWT

#### Login Incorrecto
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong"}'
```
- [ ] Devuelve código 401
- [ ] Mensaje: "Usuario o contraseña incorrectos"

#### Rate Limiting Login
```bash
# Hacer 6 intentos fallidos rápido
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/admin/login \
    -d '{"username":"admin","password":"wrong"}' &
done
```
- [ ] Primeros 5 devuelven 401
- [ ] Sexto devuelve: "Demasiados intentos de login"

### 4. Validaciones POST /api/ordenes

#### Email Inválido
```bash
curl -X POST http://localhost:3000/api/ordenes \
  -H "Content-Type: application/json" \
  -d '{"ordenId":"TEST-1","cliente":{"nombre":"Juan","apellidos":"Pérez","email":"invalid-email","whatsapp":"+5214591153960"},"boletos":[1,2,3],"totales":{"subtotal":150,"descuento":0,"totalFinal":150},"precioUnitario":50}'
```
- [ ] Código 400
- [ ] Mensaje: "Email inválido"

#### Teléfono Inválido
```bash
curl -X POST http://localhost:3000/api/ordenes \
  -H "Content-Type: application/json" \
  -d '{"ordenId":"TEST-2","cliente":{"nombre":"Juan","apellidos":"Pérez","email":"juan@example.com","whatsapp":"123"},"boletos":[1,2,3],"totales":{"subtotal":150,"descuento":0,"totalFinal":150},"precioUnitario":50}'
```
- [ ] Código 400
- [ ] Mensaje: "Teléfono debe tener 10-20 dígitos"

#### Boletos Fuera de Rango
```bash
curl -X POST http://localhost:3000/api/ordenes \
  -H "Content-Type: application/json" \
  -d '{"ordenId":"TEST-3","cliente":{"nombre":"Juan","apellidos":"Pérez","email":"juan@example.com","whatsapp":"+5214591153960"},"boletos":[...150 boletos...],"totales":{"subtotal":7500,"descuento":0,"totalFinal":7500},"precioUnitario":50}'
```
- [ ] Código 400
- [ ] Mensaje: "Cantidad de boletos debe ser 1-100"

#### Orden Duplicada
```bash
# Primer request OK
curl -X POST http://localhost:3000/api/ordenes \
  -H "Content-Type: application/json" \
  -d '{"ordenId":"TEST-DUP","cliente":{"nombre":"Juan","apellidos":"Pérez","email":"juan@example.com","whatsapp":"+5214591153960"},"boletos":[1,2,3],"totales":{"subtotal":150,"descuento":0,"totalFinal":150},"precioUnitario":50}'

# Segundo request duplicado
curl -X POST http://localhost:3000/api/ordenes \
  -H "Content-Type: application/json" \
  -d '{"ordenId":"TEST-DUP","cliente":{"nombre":"Juan","apellidos":"Pérez","email":"juan@example.com","whatsapp":"+5214591153960"},"boletos":[1,2,3],"totales":{"subtotal":150,"descuento":0,"totalFinal":150},"precioUnitario":50}'
```
- [ ] Primer: código 200, url retornada
- [ ] Segundo: código 409, mensaje "Orden duplicada"

#### Orden Válida
```bash
curl -X POST http://localhost:3000/api/ordenes \
  -H "Content-Type: application/json" \
  -d '{"ordenId":"TEST-VALID-001","cliente":{"nombre":"Juan","apellidos":"Pérez","email":"juan@example.com","whatsapp":"+5214591153960"},"boletos":[1,2,3],"totales":{"subtotal":150,"descuento":0,"totalFinal":150},"precioUnitario":50}' | jq .
```
- [ ] Código 200
- [ ] URL devuelta: `http://localhost:3000/api/ordenes/TEST-VALID-001`
- [ ] Se ve log: "Orden creada exitosamente"

### 5. Endpoints Protegidos (requieren JWT)

#### Sin Token
```bash
curl http://localhost:3000/api/ordenes
```
- [ ] Código 401
- [ ] Mensaje: "Token no proporcionado"

#### Con Token Inválido
```bash
curl http://localhost:3000/api/ordenes \
  -H "Authorization: Bearer invalid.token.here"
```
- [ ] Código 403
- [ ] Mensaje: "Token inválido o expirado"

#### Con Token Válido
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

curl http://localhost:3000/api/ordenes \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'
```
- [ ] Código 200
- [ ] Array de órdenes devuelto
- [ ] Al menos 1 orden en lista

### 6. GET /api/ordenes/:id (Orden Viewable)

```bash
curl http://localhost:3000/api/ordenes/TEST-VALID-001 | head -50
```
- [ ] Código 200
- [ ] Content-Type: text/html
- [ ] Contiene: número de orden, datos cliente, boletos, total
- [ ] Es un HTML válido

#### Orden No Existe
```bash
curl http://localhost:3000/api/ordenes/NO-EXISTE
```
- [ ] Código 404
- [ ] HTML: "Orden no encontrada"

### 7. GET /api/admin/stats (Estadísticas)

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer $TOKEN" | jq .
```
- [ ] Código 200
- [ ] Contiene: `total_ordenes`, `total_boletos`, `ingresos_totales`, `por_estado`
- [ ] Valores son números correctos

### 8. PATCH /api/ordenes/:id/estado (Cambiar Estado)

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

curl -X PATCH http://localhost:3000/api/ordenes/TEST-VALID-001/estado \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"estado":"confirmada"}' | jq .
```
- [ ] Código 200
- [ ] Mensaje: "Orden actualizada a estado: confirmada"
- [ ] En siguiente GET /api/ordenes: estado es "confirmada"

#### Estado Inválido
```bash
curl -X PATCH http://localhost:3000/api/ordenes/TEST-VALID-001/estado \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"estado":"invalid"}' | jq .
```
- [ ] Código 400
- [ ] Mensaje lista estados válidos

### 9. Panel Admin (admin-v2.html)

#### Login
- [ ] Navegar a http://localhost:8080/admin-v2.html
- [ ] Ver pantalla de login
- [ ] Introducir usuario: `admin`
- [ ] Introducir contraseña: `admin123`
- [ ] Click "Ingresar"
- [ ] Redirige al dashboard

#### Dashboard
- [ ] Ver estadísticas en tarjetas
- [ ] "Total de Órdenes": muestra número correcto
- [ ] "Ingresos Totales": muestra total en $
- [ ] "Pendientes": muestra número correcto
- [ ] "Confirmadas": muestra número correcto

#### Órdenes
- [ ] Ver tabla de órdenes
- [ ] Filtro por estado funciona
- [ ] Botones de acción están disponibles
- [ ] Click "Ver" abre modal con detalles completos
- [ ] Click "✓" confirma orden
- [ ] Click "✗" cancela orden

#### Logout
- [ ] Click "Cerrar Sesión"
- [ ] Redirige a pantalla de login
- [ ] Campo contraseña se limpia

### 10. Seguridad - Headers

```bash
curl -i http://localhost:3000 | grep -E "Content-Security|X-Frame|Strict-Transport"
```
- [ ] CSP header presente
- [ ] X-Frame-Options: SAMEORIGIN
- [ ] Strict-Transport-Security presente

### 11. Rate Limiting - Headers

```bash
curl -i http://localhost:3000/api/ordenes 2>&1 | grep -i "ratelimit"
```
- [ ] Headers presentes: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

### 12. Logging - Consola

- [ ] Al hacer login exitoso: `[INFO] Login exitoso`
- [ ] Al crear orden: `[INFO] Orden creada exitosamente`
- [ ] Al fallar login: `[WARN] Intento de login fallido`
- [ ] Al error: `[ERROR]` con detalles

---

## 🎯 Testing E2E Completo (Próximas Sesiones)

- [ ] Acceder a compra.html
- [ ] Seleccionar cantidad de boletos
- [ ] Ver descuentos correctos aplicados
- [ ] Completar datos personales
- [ ] Generar orden
- [ ] Hacer click en WhatsApp
- [ ] Abrir admin-v2.html
- [ ] Confirmar orden en admin
- [ ] Verificar BD tiene orden nueva

---

## 📋 Resumen Post-Testing

**Fehcas de prueba:** _______________  
**Testeador:** _______________  

- [ ] Todos los tests pasaron ✅
- [ ] Errores encontrados: _______________
- [ ] BD está íntegra: ✅ / ❌
- [ ] Performance aceptable: ✅ / ❌
- [ ] Listo para despliegue: ✅ / ❌

**Notas adicionales:**  
_________________________________________________

---

**Próximo:** [FASE 2 - Despliegue](FASE1_COMPLETADA.md)
