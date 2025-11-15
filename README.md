# 🎯 RifaPlus - Sistema de Rifas con WhatsApp

Sistema completo de venta de boletos de rifa con integración WhatsApp, órdenes formales, panel de administración seguro y persistencia en BD.

**Versión:** 2.2 (FASE 1 Completada ✅)  
**Estado:** Listo para producción (cliente #1)

## ✨ Características

- 🎫 **Compra de boletos** - Interfaz intuitiva con máquina de la suerte
- 📋 **Órdenes formales** - Página viewable con detalles completos
- 💬 **Integración WhatsApp** - Links `wa.me` con mensajes pre-llenados
- 📊 **Panel de admin** - Gestión segura con autenticación JWT
- 💾 **Base de datos SQLite** - Persistencia de órdenes y usuarios
- 🔒 **Seguridad** - JWT, rate limiting, sanitización, validaciones
- 📱 **Responsive** - Funciona en desktop, tablet y móvil
- 🔐 **Autenticación** - Login seguro con token de 24 horas

---

## 🚀 Quick Start

### Requisitos
- Node.js v14+
- npm

### Instalación

```bash
# 1. Clonar/descargar proyecto
cd rifas-web

# 2. Instalar dependencias backend
cd backend
npm install

# 3. Configurar BD (SQLite)
npx knex migrate:latest
npx knex seed:run
# Usuario admin: admin / admin123

cd ..
```

### Ejecutar localmente

```bash
# Terminal 1: Backend (puerto 3000)
cd backend
node server.js

# Terminal 2: Frontend (puerto 8080, en raíz del proyecto)
python3 -m http.server 8080
```

**URLs:**
- Página de compra: http://localhost:8080/compra.html
- Panel admin: http://localhost:8080/admin-v2.html
  - Usuario: `admin`
  - Contraseña: `admin123`
- Health check: http://localhost:3000

## 📚 Documentación

- **[FASE1_COMPLETADA.md](FASE1_COMPLETADA.md)** ← **EMPIEZA AQUÍ** - Resumen completo de lo implementado
- **[backend/AUTH.md](backend/AUTH.md)** - Autenticación JWT y endpoints
- **[backend/SEGURIDAD.md](backend/SEGURIDAD.md)** - Medidas de seguridad, validaciones, rate limiting
- **[GUIA_IMPLEMENTACION.md](GUIA_IMPLEMENTACION.md)** - Historia de cambios principales
- **[FIX_DESCUENTOS.md](FIX_DESCUENTOS.md)** - Lógica de paquetes y descuentos
- **[CLEANUP_LOG.md](CLEANUP_LOG.md)** - Limpieza de código

---

## 📁 Estructura del Proyecto

```
rifas-web/
├── index.html              # Página principal
├── compra.html             # Página de compra de boletos
├── orden.html              # Página de confirmación de orden
├── admin.html              # Panel de administración
│
├── css/
│   ├── styles.css          # Estilos principales
│   ├── orden-formal.css    # Estilos de modal de orden
│   └── ...
│
├── js/
│   ├── main.js             # Configuración global + utilidades
│   ├── compra.js           # Lógica de compra y máquina de suerte
│   ├── orden.js            # Lógica de página orden
│   ├── orden-formal.js     # Modal de orden formal
│   ├── modal-contacto.js   # Modal de contacto cliente
│   └── ...
│
├── backend/
│   ├── server.js           # Servidor Express
│   ├── package.json        # Dependencias
│   ├── .env                # Variables de entorno
│   ├── public/
│   │   └── ordenes/        # PDFs de órdenes (almacenamiento)
│   └── README.md           # Docs del backend
│
└── README.md               # Este archivo
```

---

## ⚙️ Configuración

### 1. Actualizar número del organizador

Editar `js/main.js`:

```javascript
window.rifaplusConfig = {
    // ...
    numeroWhatsappOrganizador: '+52 4591153960', // ← Tu número
    // ...
};
```

### 2. Actualizar cuentas bancarias

En `js/main.js`, actualizar array `bankAccounts`:

```javascript
bankAccounts: [
    {
        id: 1,
        bank: 'Tu Banco',
        accountNumber: '0000-0000-0000000000-0',
        accountType: 'Corriente',
        beneficiary: 'Tu Nombre',
        phone: '+52 449 123 4567'
    },
    // ... más cuentas
]
```

### 3. Configurar precios

En `js/main.js`:

```javascript
window.rifaplusConfig = {
    ticketPrice: 50,       // Precio por boleto
    totalTickets: 500,     // Total de boletos disponibles
    // ...
};
```

---

## 📊 Flujo de Compra

1. **Selección** - Cliente selecciona boletos (manual o máquina de suerte)
2. **Contacto** - Completa nombre, apellidos, WhatsApp
3. **Orden** - Genera orden formal con datos bancarios
4. **WhatsApp** - Mensaje automático al organizador con resumen
5. **Link** - Organizador accede a link para ver orden completa
6. **Confirmación** - Organizador marca como pagada en panel admin

---

## 🔧 Panel de Administración

Acceso: `http://localhost:8080/admin.html`

**Funciones:**
- ✅ Ver todas las órdenes en tiempo real
- ✅ Confirmar órdenes (marcar como pagadas)
- ❌ Rechazar órdenes
- 🔍 Filtrar por estado, orden ID, cliente o teléfono
- 📥 Exportar órdenes a CSV

---

## 🔄 Flujo de Datos

```
CLIENTE
  ↓
[compra.html] - Selecciona boletos
  ↓
[orden.html] - Completa datos
  ↓
[orden-formal.js] - Genera orden + POST /api/ordenes
  ↓
[backend/server.js] - Guarda orden, devuelve URL
  ↓
[wa.me] - Abre WhatsApp con mensaje + link
  ↓
ORGANIZADOR
  ↓
[admin.html] - Ve orden, confirma pago
  ↓
[localStorage] - Estado actualizado
```

---

## 📱 Endpoints del Backend

### `GET /` 
Health check - Verifica que el servidor está activo

### `POST /api/ordenes`
Guarda una nueva orden

**Request:**
```json
{
  "ordenId": "RIFA-00001",
  "cliente": { "nombre": "...", "apellidos": "...", "whatsapp": "..." },
  "boletos": [1, 2, 3],
  "totales": { "total": 150, "descuento": 0, "totalFinal": 150 },
  "cuenta": { "bank": "...", "accountNumber": "...", ... },
  "fecha": "2025-11-15T..."
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
Retorna orden como página HTML viewable + imprimible

---

## 🚀 Deploy a Producción

### Opción 1: Vercel (Frontend)

```bash
# Conectar repo a Vercel
# Deploy automático en cada push
# Tu URL: https://tu-proyecto.vercel.app
```

### Opción 2: Railway/Heroku (Backend + Frontend)

```bash
# 1. Crear app en Railway/Heroku
# 2. Conectar repo
# 3. Configurar comandos:
#    - Build: npm install (en backend/)
#    - Start: npm start (en backend/)
# 4. Agregar variables de entorno (.env)
# 5. Deploy

# Actualizar en js/main.js:
apiEndpoint: 'https://tu-backend.railway.app/api'
```

---

## 💾 Persistencia de Datos

**Actualmente:** localStorage (cliente)
- ✅ Rápido para desarrollo/demo
- ❌ Datos perdidos si se borra cache
- ❌ No compartido entre dispositivos

**Para producción (futuro):**
- Implementar SQLite/PostgreSQL en backend
- Endpoints para GET/POST/PATCH órdenes en BD
- Autenticación en panel admin

---

## 📝 Notas

- **WhatsApp**: Usa `wa.me` links (sin API credentials)
- **Órdenes**: Visualizables en URL (GET /api/ordenes/:id)
- **Órdenes**: Almacenadas en memoria (se pierden al reiniciar backend)
- **Seguridad**: En producción, agregar autenticación en panel admin

---

## 🐛 Troubleshooting

### Backend no responde
```bash
curl http://localhost:3000/
# Debería devolver JSON con versión
```

### WhatsApp no abre
- Verificar número en `js/main.js`
- Usar formato: `+52 4591153960`
- Tener WhatsApp activo (web/app/desktop)

### Órdenes no aparecen en admin
- Verificar que `localStorage` está habilitado
- Probar en navegador incógnito
- Recargar admin.html (Cmd+Shift+R)

---

## 📄 Licencia

MIT

---

**¿Dudas?** Revisar archivos específicos:
- Frontend: `js/main.js`, `js/compra.js`, `js/orden-formal.js`
- Backend: `backend/server.js`, `backend/README.md`
- Admin: `admin.html`
