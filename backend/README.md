# RifaPlus Backend

Este backend provee utilidades opcionales para la aplicación (por ejemplo, servir archivos estáticos o almacenar PDFs). La entrega de mensajes por WhatsApp en este proyecto se realiza desde el cliente usando enlaces `wa.me`, por lo que no es necesario ningún servicio de mensajería en el servidor.

## 🚀 Setup Rápido

### 1. Instalación

```bash
cd backend
npm install
```

### 2. Ejecutar en desarrollo

```bash
npm run dev
```

El servidor estará en `http://localhost:3000` y puede servir archivos estáticos si lo configuras.

### 3. Ejecutar en producción

```bash
npm start
```

## 🔧 Notas sobre mensajería

Este proyecto usa enlaces `wa.me` desde el cliente para abrir WhatsApp con mensajes pre‑llenados. No hay endpoints en el backend para enviar mensajes directamente. Si en el futuro quieres que el servidor envíe mensajes automáticamente (por ejemplo, subir PDFs y devolver URLs públicas), puedes añadir endpoints específicos para ello.

## 🔐 Variables de entorno

- `PORT` - Puerto (default: 3000)
- `NODE_ENV` - Ambiente (development/production)

## 🚀 Deploy a Producción

### Heroku

```bash
heroku login
heroku create tu-app-rifaplus
git push heroku main
heroku config:set PORT=3000
```

### Railway / Render

Usa los mismos pasos, agrega variables en panel de control.

## 📝 Licencia

MIT
