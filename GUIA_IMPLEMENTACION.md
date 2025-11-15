# 🎯 Guía de Implementación - RifaPlus

**Última actualización:** 2025-01-13  
**Versión:** 1.2 (wa.me + viewable orders)  
**Estado:** ✅ Producción lista

---

## 📌 Resumen de la Arquitectura Actual

Esta versión implementa:

✅ **WhatsApp wa.me links** (sin API, sin credenciales)  
✅ **Órdenes viewables** (renderizadas en backend, URL shareable)  
✅ **Panel de admin** (gestión en tiempo real)  
✅ **localStorage** (client-side; upgradeable a BD)

**Removido:** Twilio, WhatsApp Cloud API, PDF generation local

---

## 🚀 Instalación Rápida

### 1. Configurar Frontend

Editar `js/main.js`:

```javascript
window.rifaplusConfig = {
    apiEndpoint: 'http://localhost:3000/api',
    numeroWhatsappOrganizador: '+52 4591153960',  // ← TU NÚMERO
    
    bankAccounts: [
        {
            id: 1,
            bank: 'Tu Banco',
            accountNumber: '0000-0000-0000-0000-00',
            accountType: 'Corriente',
            beneficiary: 'Tu Nombre',
            phone: '+52 449 123 4567'
        }
    ],
    
    ticketPrice: 50,
    totalTickets: 500
};
```

### 2. Instalar Backend

```bash
cd backend
npm install
cp .env.example .env
```

Verificar `backend/.env`:
```
PORT=3000
NODE_ENV=development
```

### 3. Ejecutar Localmente

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd ~/Desktop/rifas-web
python3 -m http.server 8080
```

Acceder: `http://localhost:8080/compra.html`

---

## 📊 Flujo de Datos

```
CLIENTE
  ↓
[compra.html] Selecciona boletos
  ↓
[orden.html] Completa datos
  ↓
POST /api/ordenes
  ↓
[backend/server.js] Guarda orden
  ↓
Response: { url: "http://localhost:3000/api/ordenes/RIFA-00001" }
  ↓
wa.me link con mensaje + link
  ↓
ORGANIZADOR
  ↓
[admin.html] Ve órdenes, confirma pago
```

---

## 🔧 Endpoints del Backend

### `GET /`
Health check

### `POST /api/ordenes`
Guardar orden

**Request:**
```json
{
  "ordenId": "RIFA-00001",
  "cliente": {
    "nombre": "Juan",
    "apellidos": "Pérez",
    "whatsapp": "+52 4591234567"
  },
  "boletos": [1, 2, 3],
  "totales": {
    "total": 150,
    "descuento": 0,
    "totalFinal": 150
  },
  "cuenta": {
    "bank": "Banco X",
    "accountNumber": "...",
    "beneficiary": "...",
    "phone": "..."
  },
  "fecha": "2025-01-13T..."
}
```

**Response:**
```json
{
  "success": true,
  "url": "http://localhost:3000/api/ordenes/RIFA-00001"
}
```

### `GET /api/ordenes/:id`
Ver orden como página HTML

Ejemplo: `GET /api/ordenes/RIFA-00001`

---

## 🎨 Customización

### Cambiar Mensaje WhatsApp

Editar `js/orden-formal.js` → función `enviarOrdenPorWhatsApp()`:

```javascript
const mensajeOrden = `
🎯 *NUEVA ORDEN DE COMPRA*

📋 *ID:* ${orden.ordenId}
👤 *Cliente:* ${orden.cliente.nombre}
💰 *Total:* $${orden.totales.totalFinal}
🔗 *Ver orden:* ${urlOrden}

Confirma el pago en admin.
`.trim();
```

### Agregar Cuenta Bancaria

En `js/main.js`, agregar a `bankAccounts`:

```javascript
{
    id: 2,
    bank: 'Otro Banco',
    accountNumber: '0000-0000-0000-0000-00',
    accountType: 'Ahorro',
    beneficiary: 'Tu Nombre',
    phone: '+52 449 123 4567'
}
```

---

## 🌐 Deploy a Producción

### Opción 1: Vercel + Railway

**Frontend (Vercel):**
```bash
# Conectar repo a Vercel → Deploy automático
# URL: https://rifa-ejemplo.vercel.app
```

**Backend (Railway):**
```bash
# Crear proyecto en railway.app
# Conectar GitHub → Deploy automático
# Variables en .env: PORT=3000, NODE_ENV=production
# URL: https://rifa-backend-xxx.railway.app
```

Actualizar `js/main.js`:
```javascript
apiEndpoint: 'https://rifa-backend-xxx.railway.app/api'
```

### Opción 2: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production
COPY . .
CMD ["node", "backend/server.js"]
```

```bash
docker build -t rifa .
docker run -p 3000:3000 -e NODE_ENV=production rifa
```

---

## 🔐 Seguridad

### Desarrollo (Localhost)
✅ Seguro

### Producción
⚠️ **Agregar autenticación en admin.html** (login + contraseña)  
⚠️ **Usar HTTPS** (Let's Encrypt)  
⚠️ **Migrar a base de datos** (localStorage → PostgreSQL)  
⚠️ **Validar en backend** (prevenir duplicados, rate limiting)

---

## 🚨 Troubleshooting

### Backend no responde
```bash
curl http://localhost:3000/
# Debe devolver: {"status":"online",...}
```

### WhatsApp no abre
- Verificar número: `+52 4591153960` (con +)
- Tener WhatsApp activo (app, web o desktop)

### Órdenes no aparecen en admin
- Verificar localStorage habilitado
- Recargar con `Cmd+Shift+R`
- DevTools → Application → localStorage

### Error CORS
- Backend debe tener `cors()` habilitado (está en `server.js`)

---

## 📁 Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `compra.html` | Compra de boletos |
| `orden.html` | Confirmación y pago |
| `admin.html` | Panel administrador |
| `js/compra.js` | Lógica compra + máquina suerte |
| `js/orden.js` | Métodos de pago |
| `js/orden-formal.js` | Modal orden + envío WhatsApp |
| `backend/server.js` | API principal |
| `js/main.js` | Config global + utilidades |

---

## ✅ Checklist Pre-Producción

- [ ] Número organizador actualizado
- [ ] Cuentas bancarias configuradas
- [ ] Backend testado (`curl http://localhost:3000/`)
- [ ] Frontend sin errores
- [ ] Compra end-to-end funciona
- [ ] Admin muestra órdenes
- [ ] HTTPS configurado
- [ ] Autenticación en admin (si prod)
- [ ] BD migrada (si prod)

---

¡Listo! 🎉
