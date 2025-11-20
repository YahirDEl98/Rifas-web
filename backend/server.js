// backend/server.js - Backend Express para RifaPlus
// Provee endpoints para guardar órdenes y servir páginas viewables
// v2.0: Migrado a SQLite con Knex para persistencia segura
// v2.1: Autenticación JWT para panel admin
// v2.2: Validaciones, seguridad, sanitización y rate limiting

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const sanitizeHtml = require('sanitize-html');
require('dotenv').config();

const app = express();
const db = require('./db'); // Instancia Knex con SQLite

// Configuración
const JWT_SECRET = process.env.JWT_SECRET || 'rifa-plus-secret-key-development'; // CAMBIAR EN PRODUCCIÓN
const JWT_EXPIRES_IN = '24h'; // Token expira en 24 horas

// Middleware de Seguridad
app.use(helmet()); // Headers de seguridad HTTP
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Rate Limiting
const limiterGeneral = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por ventana
    message: 'Demasiadas solicitudes, intenta más tarde',
    standardHeaders: true,
    legacyHeaders: false
});

const limiterLogin = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos de login
    message: 'Demasiados intentos de login, intenta más tarde',
    skipSuccessfulRequests: true // No cuenta intentos exitosos
});

const limiterOrdenes = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 10, // máximo 10 órdenes por minuto por IP
    message: 'Demasiadas órdenes, intenta más tarde'
});

app.use(limiterGeneral); // Aplicar a todas las rutas

// Servir archivos estáticos en /public
app.use('/public', express.static(path.join(__dirname, 'public')));

/**
 * Middleware: Verificar JWT
 * Usado en endpoints protegidos (/api/admin/*, /api/ordenes POST, PATCH, etc.)
 */
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token no proporcionado',
            code: 'NO_TOKEN'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, usuario) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token inválido o expirado',
                code: 'INVALID_TOKEN'
            });
        }
        req.usuario = usuario; // Adjuntar usuario al request
        next();
    });
}

// ===== FUNCIONES DE VALIDACIÓN =====

/**
 * Sanitiza strings: elimina HTML, trimea espacios
 */
function sanitizar(str) {
    if (typeof str !== 'string') return '';
    return sanitizeHtml(str, { 
        allowedTags: [],
        allowedAttributes: {}
    }).trim();
}

/**
 * Valida email
 */
function esEmailValido(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valida teléfono (básico)
 */
function esTelefonoValido(tel) {
    return tel && tel.length >= 10 && tel.length <= 20;
}

/**
 * Valida que cantidad de boletos sea válida
 */
function esCantidadBoletosValida(cantidad) {
    return Number.isInteger(cantidad) && cantidad > 0 && cantidad <= 100;
}

/**
 * Valida precio (número positivo)
 */
function esPrecioValido(precio) {
    const num = parseFloat(precio);
    return !isNaN(num) && num > 0;
}

/**
 * Logger simple (futuro: usar Winston o Pino)
 */
function log(nivel, mensaje, datos = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${nivel.toUpperCase()}] ${mensaje}`, datos);
}

// Rutas
app.get('/', (req, res) => {
    res.json({ 
        mensaje: 'API RifaPlus - Servidor en funcionamiento',
        version: '2.2',
        auth: 'JWT habilitado',
        seguridad: 'rate-limiting + sanitización + helmet'
    });
});

/**
 * POST /api/admin/login
 * Autentica usuario admin y devuelve JWT
 * Body: { username: 'admin', password: 'admin123' }
 * Protegido con rate limiting
 */
app.post('/api/admin/login', limiterLogin, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validar entrada
        if (!username || !password) {
            log('warn', 'Intento de login sin credenciales', { ip: req.ip });
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña requeridos'
            });
        }

        // Sanitizar username (prevenir inyección)
        const usernameSanitizado = sanitizar(username);
        if (usernameSanitizado.length === 0) {
            log('warn', 'Username vacío después de sanitizar', { ip: req.ip });
            return res.status(400).json({
                success: false,
                message: 'Usuario inválido'
            });
        }

        // Buscar usuario en BD
        const usuario = await db('admin_users').where('username', usernameSanitizado).first();

        if (!usuario || !usuario.activo) {
            log('warn', 'Intento de login fallido', { username: usernameSanitizado, ip: req.ip });
            return res.status(401).json({
                success: false,
                message: 'Usuario o contraseña incorrectos'
            });
        }

        // Verificar contraseña
        const passwordValida = await bcrypt.compare(password, usuario.password_hash);

        if (!passwordValida) {
            return res.status(401).json({
                success: false,
                message: 'Usuario o contraseña incorrectos'
            });
        }

        // Generar JWT
        const token = jwt.sign(
            { 
                id: usuario.id, 
                username: usuario.username, 
                email: usuario.email 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Actualizar último acceso
        await db('admin_users').where('id', usuario.id).update({
            ultimo_acceso: new Date()
        });

        log('info', 'Login exitoso', { username: usuario.username, ip: req.ip });

        return res.json({
            success: true,
            token: token,
            usuario: {
                id: usuario.id,
                username: usuario.username,
                email: usuario.email
            },
            expiresIn: JWT_EXPIRES_IN
        });
    } catch (error) {
        log('error', 'POST /api/admin/login error', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Error al autenticar',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/admin/logout
 * Endpoint de logout (principalmente para limpiar token en cliente)
 */
app.post('/api/admin/logout', verificarToken, (req, res) => {
    // JWT es stateless, no hay nada que limpiar en servidor
    // El cliente simplemente descarta el token
    res.json({
        success: true,
        message: 'Sesión cerrada'
    });
});

/**
 * POST /api/verify-payment
 * Endpoint para verificar pagos (futuro panel de admin)
 */
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { ordenId, comprobante } = req.body;

        // Aquí irá lógica para verificar pagos
        // Por ahora solo confirmamos que se recibió

        res.json({
            success: true,
            message: 'Pago registrado para revisión',
            ordenId: ordenId
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/ordenes
 * Guarda una nueva orden en la BD y devuelve un link viewable
 * Validaciones exhaustivas:
 * - No duplicar números de orden
 * - Validar estructura de datos
 * - Sanitizar inputs
 * - Limitar cantidad de boletos
 * - Validar precios y formatos
 * Protegido con rate limiting
 */
app.post('/api/ordenes', limiterOrdenes, async (req, res) => {
    try {
        const orden = req.body;
            console.log('DEBUG POST /api/ordenes body=', JSON.stringify(orden).slice(0,1000));
        
        // ===== VALIDACIONES EXHAUSTIVAS =====
        
        // Validar ordenId
        if (!orden.ordenId || typeof orden.ordenId !== 'string') {
            log('warn', 'POST /api/ordenes: ordenId inválido', { ip: req.ip });
            return res.status(400).json({ success: false, message: 'Orden ID inválido' });
        }
        const ordenId = sanitizar(orden.ordenId);
        if (ordenId.length === 0 || ordenId.length > 50) {
            return res.status(400).json({ success: false, message: 'Orden ID debe tener entre 1-50 caracteres' });
        }
        
        // Validar cliente
        if (!orden.cliente || typeof orden.cliente !== 'object') {
            return res.status(400).json({ success: false, message: 'Datos del cliente requeridos' });
        }

        const nombre = sanitizar(orden.cliente.nombre || '');
        const apellidos = sanitizar(orden.cliente.apellidos || '');
        const email = sanitizar(orden.cliente.email || '');
        const whatsapp = sanitizar(orden.cliente.whatsapp || '');

        if (nombre.length === 0) {
            return res.status(400).json({ success: false, message: 'Nombre del cliente requerido' });
        }
        // Email ahora opcional: sólo validar si fue provisto
        if (email && !esEmailValido(email)) {
            return res.status(400).json({ success: false, message: 'Email inválido' });
        }
        if (!esTelefonoValido(whatsapp)) {
            return res.status(400).json({ success: false, message: 'Teléfono debe tener 10-20 dígitos' });
        }

        // Validar boletos
        if (!orden.boletos || !Array.isArray(orden.boletos) || orden.boletos.length === 0) {
            return res.status(400).json({ success: false, message: 'Boletos requeridos' });
        }
        if (!esCantidadBoletosValida(orden.boletos.length)) {
            return res.status(400).json({ success: false, message: 'Cantidad de boletos debe ser 1-100' });
        }

        // Validar totales
        if (!orden.totales || typeof orden.totales !== 'object') {
            return res.status(400).json({ success: false, message: 'Totales requeridos' });
        }
        // Aceptar tanto `subtotal` como `total` proveniente del frontend
        const subtotalVal = (typeof orden.totales.subtotal !== 'undefined') ? orden.totales.subtotal : orden.totales.total;
        if (!esPrecioValido(subtotalVal)) {
            return res.status(400).json({ success: false, message: 'Subtotal inválido' });
        }
        if (!esPrecioValido(orden.totales.totalFinal)) {
            return res.status(400).json({ success: false, message: 'Total final inválido' });
        }

        // Validar precioUnitario
        const precioUnitario = parseFloat(orden.precioUnitario || 50);
        if (!esPrecioValido(precioUnitario)) {
            return res.status(400).json({ success: false, message: 'Precio unitario inválido' });
        }

        // Validar que no exista duplicada
        const existente = await db('ordenes').where('numero_orden', ordenId).first();
        if (existente) {
            log('warn', 'Intento de orden duplicada', { ordenId, ip: req.ip });
            return res.status(409).json({ 
                success: false, 
                message: 'Orden duplicada - ya existe una orden con este ID' 
            });
        }

        // ===== GUARDAR EN BD =====
        await db('ordenes').insert({
            numero_orden: ordenId,
            cantidad_boletos: orden.boletos.length,
            precio_unitario: precioUnitario,
            subtotal: parseFloat(subtotalVal),
            descuento: parseFloat(orden.totales.descuento || 0),
            total: parseFloat(orden.totales.totalFinal),
            nombre_cliente: `${nombre} ${apellidos}`.trim(),
            email_cliente: email,
            telefono_cliente: whatsapp,
            metodo_pago: sanitizar(orden.metodoPago || 'transferencia'),
            detalles_pago: sanitizar(orden.cuenta?.accountNumber || ''),
            estado: 'pendiente',
            boletos: JSON.stringify(orden.boletos),
            notas: sanitizar(orden.notas || '')
        });

        log('info', 'Orden creada exitosamente', { ordenId, cantidad: orden.boletos.length, total: orden.totales.totalFinal });

        const host = req.headers.host || `localhost:${PORT}`;
        const url = `http://${host}/api/ordenes/${ordenId}`;

        return res.json({ success: true, url });
    } catch (error) {
        log('error', 'POST /api/ordenes error', { error: error.message });
        return res.status(500).json({ 
            success: false, 
            message: 'Error al guardar orden',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/ordenes/:id
 * Devuelve la orden en formato HTML viewable desde la BD
 */
app.get('/api/ordenes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const ordenRow = await db('ordenes').where('numero_orden', id).first();

        if (!ordenRow) {
            return res.status(404).type('text/html').send(`
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Orden no encontrada</title>
                    <style>
                        body { font-family: sans-serif; text-align: center; padding: 2rem; background: #f3f4f6; }
                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>❌ Orden no encontrada</h1>
                        <p>El ID de orden <strong>${id}</strong> no existe en el sistema.</p>
                    </div>
                </body>
                </html>
            `);
        }

        // Parsear boletos JSON
        let boletos = [];
        try {
            boletos = JSON.parse(ordenRow.boletos);
        } catch (e) {
            boletos = [];
        }

        const fecha = new Date(ordenRow.created_at).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let filasboletos = '';
        boletos.forEach((numero, index) => {
            filasboletos += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${numero}</strong></td>
                    <td>$${ordenRow.precio_unitario.toFixed(2)}</td>
                </tr>
            `;
        });

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orden de Pago ${ordenRow.numero_orden}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem 1rem;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 1rem;
        }
        .header h1 { color: #2563eb; font-size: 1.8rem; }
        .header p { color: #666; margin-top: 0.5rem; }
        .section {
            margin-bottom: 2rem;
        }
        .section-title {
            background: #f3f4f6;
            padding: 0.75rem 1rem;
            border-left: 4px solid #2563eb;
            font-weight: bold;
            margin-bottom: 1rem;
            color: #1f2937;
        }
        .field-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .field {
            padding: 0.75rem;
            background: #f9fafb;
            border-radius: 6px;
        }
        .field-label { font-size: 0.85rem; color: #666; font-weight: 600; text-transform: uppercase; }
        .field-value { font-size: 1rem; color: #1f2937; font-weight: 500; margin-top: 0.25rem; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background: #f3f4f6;
            font-weight: 600;
            color: #1f2937;
        }
        .total-row {
            background: #dbeafe;
            font-weight: bold;
            color: #1e40af;
        }
        .footer {
            text-align: center;
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e7eb;
            color: #666;
            font-size: 0.9rem;
        }
        .print-btn {
            display: block;
            margin: 1rem auto;
            padding: 0.75rem 1.5rem;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
        }
        .print-btn:hover { background: #1e40af; }
        @media print {
            body { background: white; padding: 0; }
            .print-btn { display: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Orden de Pago</h1>
            <p><strong>#${ordenRow.numero_orden}</strong></p>
            <p style="font-size: 0.9rem; color: #999; margin-top: 0.5rem;">${fecha}</p>
        </div>

        <button class="print-btn" onclick="window.print()">📄 Imprimir / Guardar como PDF</button>

        <div class="section">
            <div class="section-title">📋 Datos del Cliente</div>
            <div class="field-row">
                <div class="field">
                    <div class="field-label">Nombre Completo</div>
                    <div class="field-value">${ordenRow.nombre_cliente}</div>
                </div>
                <div class="field">
                    <div class="field-label">WhatsApp</div>
                    <div class="field-value">${ordenRow.telefono_cliente}</div>
                </div>
            </div>
            <div class="field-row">
                <div class="field">
                    <div class="field-label">Email</div>
                    <div class="field-value">${ordenRow.email_cliente}</div>
                </div>
                <div class="field">
                    <div class="field-label">Estado</div>
                    <div class="field-value">${ordenRow.estado.toUpperCase()}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">🎫 Detalles de Compra</div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Boleto</th>
                        <th>Precio Unitario</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasboletos}
                    <tr class="total-row">
                        <td colspan="2">Subtotal (${boletos.length} boletos)</td>
                        <td>$${ordenRow.subtotal.toFixed(2)}</td>
                    </tr>
                    ${ordenRow.descuento > 0 ? `
                    <tr class="total-row">
                        <td colspan="2">Descuento</td>
                        <td>-$${ordenRow.descuento.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    <tr class="total-row">
                        <td colspan="2"><strong>TOTAL A PAGAR</strong></td>
                        <td><strong>$${ordenRow.total.toFixed(2)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>

        ${ordenRow.detalles_pago ? `
        <div class="section">
            <div class="section-title">💳 Detalles de Pago</div>
            <div class="field">
                <div class="field-label">Información</div>
                <div class="field-value">${ordenRow.detalles_pago}</div>
            </div>
        </div>
        ` : ''}

        <div class="footer">
            <p>✅ Esta orden fue registrada el ${fecha}</p>
            <p>Gracias por tu participación en nuestra rifa 🍀</p>
        </div>
    </div>
</body>
</html>
        `;

        res.type('text/html').send(html);
    } catch (error) {
        console.error('GET /api/ordenes/:id error:', error);
        res.status(500).type('text/html').send(`
            <html>
            <head><title>Error</title></head>
            <body><h1>❌ Error: ${error.message}</h1></body>
            </html>
        `);
    }
});

/**
 * GET /api/ordenes
 * Lista todas las órdenes (protegido con JWT)
 * Query params: ?estado=pendiente, ?limit=50, ?offset=0
 */
app.get('/api/ordenes', verificarToken, async (req, res) => {
    try {
        const { estado, limit = 50, offset = 0 } = req.query;
        
        let query = db('ordenes');
        
        if (estado) {
            query = query.where('estado', estado);
        }
        
        const total = await db('ordenes').count('* as count').first();
        const ordenes = await query
            .orderBy('created_at', 'desc')
            .limit(Math.min(parseInt(limit), 100))
            .offset(parseInt(offset));

        // Parsear boletos de cada orden
        const ordenesParsadas = ordenes.map(o => ({
            ...o,
            ordenId: o.numero_orden,
            boletos: JSON.parse(o.boletos || '[]')
        }));

        return res.json({
            success: true,
            data: ordenesParsadas,
            total: total.count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('GET /api/ordenes error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener órdenes',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/public/ordenes-stats
 * Estadísticas públicas de órdenes (SIN autenticación)
 * Usado por el countdown para mostrar progreso de venta
 */
app.get('/api/public/ordenes-stats', async (req, res) => {
    try {
        // Obtener solo órdenes confirmadas y completadas (boletos vendidos)
        const stats = await db('ordenes')
            .whereIn('estado', ['confirmada', 'completada'])
            .select(
                db.raw('COUNT(*) as total_ordenes'),
                db.raw('SUM(cantidad_boletos) as total_boletos_vendidos')
            )
            .first();

        return res.json({
            success: true,
            data: {
                total_ordenes: stats.total_ordenes || 0,
                total_boletos_vendidos: stats.total_boletos_vendidos || 0,
                porcentaje_vendido: 0 // Será calculado en el frontend
            }
        });
    } catch (error) {
        console.error('GET /api/public/ordenes-stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/public/boletos
 * Devuelve listas públicas de boletos: "sold" (confirmada/completada) y "reserved" (pendiente)
 * Usado por la UI de compra para marcar números reales como vendidos/apartados
 */
app.get('/api/public/boletos', async (req, res) => {
    try {
        // Pedir todas las órdenes relevantes
        const ordenesVendidas = await db('ordenes')
            .whereIn('estado', ['confirmada', 'completada'])
            .select('boletos');

        const ordenesApartadas = await db('ordenes')
            .where('estado', 'pendiente')
            .select('boletos');

        const parseBoletos = rows => {
            const set = new Set();
            rows.forEach(r => {
                try {
                    const arr = JSON.parse(r.boletos || '[]');
                    if (Array.isArray(arr)) {
                        arr.forEach(n => set.add(Number(n)));
                    }
                } catch (e) {
                    // Ignorar filas con JSON inválido
                }
            });
            return Array.from(set).sort((a, b) => a - b);
        };

        const sold = parseBoletos(ordenesVendidas);
        const reserved = parseBoletos(ordenesApartadas);

        return res.json({
            success: true,
            data: {
                sold,
                reserved
            }
        });
    } catch (error) {
        console.error('GET /api/public/boletos error:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener boletos', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

/**
 * GET /api/admin/stats
 * Estadísticas del sistema (protegido con JWT)
 */
app.get('/api/admin/stats', verificarToken, async (req, res) => {
    try {
        const stats = await db('ordenes').select(
            db.raw('COUNT(*) as total_ordenes'),
            db.raw('SUM(cantidad_boletos) as total_boletos'),
            db.raw('SUM(total) as ingresos_totales'),
            db.raw('AVG(total) as promedio_orden')
        ).first();

        const porEstado = await db('ordenes').select('estado')
            .count('* as cantidad')
            .groupBy('estado');

        return res.json({
            success: true,
            data: {
                ...stats,
                por_estado: porEstado
            }
        });
    } catch (error) {
        console.error('GET /api/admin/stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
/**
 * PATCH /api/ordenes/:id/estado
 * Actualizar estado de una orden (protegido con JWT)
 * Body: { estado: 'confirmada' }
 */
app.patch('/api/ordenes/:id/estado', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['pendiente', 'confirmada', 'cancelada', 'completada'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: `Estado inválido. Válidos: ${estadosValidos.join(', ')}`
            });
        }

        const resultado = await db('ordenes')
            .where('numero_orden', id)
            .update({ 
                estado: estado,
                updated_at: new Date()
            });

        if (resultado === 0) {
            return res.status(404).json({
                success: false,
                message: 'Orden no encontrada'
            });
        }

        return res.json({
            success: true,
            message: `Orden actualizada a estado: ${estado}`
        });
    } catch (error) {
        console.error('PATCH /api/ordenes/:id/estado error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar orden',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Endpoint removido: POST /api/upload-pdf
// Razón: Con wa.me + órdenes HTML viewables, ya no necesitamos subir PDFs al servidor

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor RifaPlus corriendo en puerto ${PORT}`);
    console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
