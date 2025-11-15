// orden-formal.js - Modal de orden formal con generación de PDF y envío por WhatsApp

let ordenActual = null;

function abrirOrdenFormal(cuenta) {
    // Compilar datos de la orden
    const cliente = JSON.parse(localStorage.getItem('rifaplus_cliente') || '{}');
    const boletos = JSON.parse(localStorage.getItem('rifaplus_boletos') || '[]');
    const totales = JSON.parse(localStorage.getItem('rifaplus_total') || '{}');

    ordenActual = {
        ordenId: cliente.ordenId,
        cliente: {
            nombre: cliente.nombre,
            apellidos: cliente.apellidos,
            whatsapp: cliente.whatsapp,
            email: cliente.email || `${cliente.whatsapp.replace(/[^0-9]/g,'') || Date.now()}@noemail.local`
        },
        cuenta: cuenta,
        boletos: boletos,
        totales: totales,
        fecha: new Date().toISOString(),
        // La referencia será únicamente el ID de la rifa (RIFA-00001)
        referencia: `${cliente.ordenId}`
    };

    // Guardar en storage
    localStorage.setItem('rifaplus_orden_actual', JSON.stringify(ordenActual));

    // Renderizar modal
    renderizarOrdenFormal(ordenActual);

    // Mostrar modal
    const modal = document.getElementById('modalOrdenFormal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function cerrarOrdenFormal() {
    const modal = document.getElementById('modalOrdenFormal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

function renderizarOrdenFormal(orden) {
    const contenedor = document.getElementById('contenidoOrdenFormal');
    if (!contenedor) return;

    const fecha = new Date(orden.fecha);
    const fechaFormato = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Generar filas de boletos
    let filasboletos = '';
    orden.boletos.forEach((numero, index) => {
        filasboletos += `
            <tr>
                <td>${index + 1}</td>
                <td>${numero}</td>
                <td>$${window.rifaplusConfig.ticketPrice || 50}</td>
            </tr>
        `;
    });

    // HTML de la orden
    const html = `
        <div class="orden-documento" id="documentoPDF">
            <!-- Header del documento -->
            <div class="documento-header">
                <div class="documento-logo">
                    🎯 ${window.rifaplusConfig.nombreOrganizador || 'RifaPlus'}
                </div>
                <div class="documento-numero">
                    <div class="documento-numero-label">Orden de Pago #</div>
                    <div class="documento-numero-valor">${orden.ordenId}</div>
                </div>
            </div>

            <!-- Fecha -->
            <div style="text-align: center; color: var(--text-light); margin-bottom: 1.5rem; font-size: 0.9rem;">
                Emitida: ${fechaFormato}
            </div>

            <!-- Sección 1: Datos del Cliente -->
            <div class="documento-seccion">
                <div class="documento-seccion-titulo">📋 Datos del Cliente</div>
                <div class="documento-grid">
                    <div class="documento-campo">
                        <div class="documento-campo-label">Nombre Completo</div>
                        <div class="documento-campo-valor">${orden.cliente.nombre} ${orden.cliente.apellidos}</div>
                    </div>
                    <div class="documento-campo">
                        <div class="documento-campo-label">Número WhatsApp</div>
                        <div class="documento-campo-valor">${orden.cliente.whatsapp}</div>
                    </div>
                </div>
            </div>

            <!-- Sección 2: Detalle de Compra -->
            <div class="documento-seccion">
                <div class="documento-seccion-titulo">🎫 Detalle de Compra</div>
                <table class="documento-tabla">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Boleto</th>
                            <th>Precio</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasboletos}
                        <tr class="documento-tabla-total">
                            <td colspan="2">Subtotal (${orden.boletos.length} boletos)</td>
                            <td>$${(orden.totales.total || 0).toFixed(2)}</td>
                        </tr>
                        ${orden.totales.descuento > 0 ? `
                        <tr class="documento-tabla-total">
                            <td colspan="2">Descuento (${orden.totales.descuento >= orden.totales.total * 0.2 ? '20%' : '10%'})</td>
                            <td>-$${orden.totales.descuento.toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        <tr class="documento-tabla-total" style="font-size: 1.1rem; background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%);">
                            <td colspan="2">TOTAL A PAGAR</td>
                            <td style="color: var(--primary-dark);">$${(orden.totales.totalFinal || 0).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Sección 3: Detalles Bancarios -->
            <div class="documento-seccion">
                <div class="documento-seccion-titulo">💳 Detalles de Transferencia</div>
                <div class="detalles-banco">
                    <div class="detalles-banco-titulo">⚠️ IMPORTANTE - Complete estos datos en su transferencia:</div>
                    <div class="detalles-banco-grid">
                        <div class="detalles-banco-item">
                            <div class="detalles-banco-label">Banco</div>
                            <div class="detalles-banco-valor">${orden.cuenta.bank}</div>
                        </div>
                        <div class="detalles-banco-item">
                            <div class="detalles-banco-label">Tipo de Cuenta</div>
                            <div class="detalles-banco-valor">${orden.cuenta.accountType}</div>
                        </div>
                        <div class="detalles-banco-item">
                            <div class="detalles-banco-label">Beneficiario</div>
                            <div class="detalles-banco-valor">${orden.cuenta.beneficiary}</div>
                        </div>
                        <div class="detalles-banco-item">
                            <div class="detalles-banco-label">Número de Cuenta</div>
                            <div class="detalles-banco-valor">${orden.cuenta.accountNumber}</div>
                        </div>
                        <div class="detalles-banco-item" style="grid-column: 1/-1;">
                            <div class="detalles-banco-label">Referencia de Pago (Concepto)</div>
                            <div class="detalles-banco-valor" style="font-size: 1.2rem;">${orden.referencia}</div>
                        </div>
                        <div class="detalles-banco-item" style="grid-column: 1/-1;">
                            <div class="detalles-banco-label">Teléfono de Contacto</div>
                            <div class="detalles-banco-valor">${orden.cuenta.phone}</div>
                        </div>
                    </div>
                </div>

                <div style="background: #F3F4F6; padding: 1rem; border-radius: var(--radius-lg); margin-top: 1rem; border-left: 4px solid var(--primary);">
                    <div style="font-weight: 700; color: var(--primary-dark); margin-bottom: 0.5rem;">📝 Instrucciones:</div>
                    <ol style="margin: 0; padding-left: 1.5rem; color: var(--text-dark);">
                        <li>Realiza una transferencia por el monto total indicado</li>
                        <li>Usa la referencia especificada como "concepto" de la transferencia</li>
                        <li>Envía el comprobante de pago al WhatsApp del organizador</li>
                        <li>Indica el número de orden para que confirmen tu pago</li>
                    </ol>
                </div>
            </div>

            <!-- Pie del documento -->
            <div class="documento-footer">
                <div class="documento-footer-nota">✅ Esta orden es válida por 24 horas</div>
                <div style="margin-top: 1rem;">Gracias por tu participación en nuestra rifa</div>
            </div>
        </div>
    `;

    contenedor.innerHTML = html;
}

async function enviarOrdenPorWhatsApp() {
    if (!ordenActual) {
        rifaplusUtils.showFeedback('❌ Error: No hay orden para enviar', 'error');
        return;
    }

    // Build message text
    function makeOrderMessage(ord) {
        const cliente = ord.cliente || {};
        const ordenId = ord.ordenId || '';
        const banco = ord.cuenta ? ord.cuenta.bank : '';
        const monto = ord.totales ? (ord.totales.totalFinal || ord.totales.total || 0) : 0;
        const lines = [
            '🎯 ORDEN DE PAGO - RIFA',
            `Orden: ${ordenId}`,
            `Cliente: ${cliente.nombre || ''} ${cliente.apellidos || ''}`,
            `Banco: ${banco}`,
            `Monto: $${monto}`,
            '',
            'He realizado la transferencia. Adjunto comprobante cuando lo tenga. Gracias.'
        ];
        return lines.join('\n');
    }

    // Clean phone and build wa.me url
    function buildWaMeUrl(phone, text) {
        if (!phone) phone = '';
        let cleaned = phone.replace(/[^0-9+]/g, '');
        cleaned = cleaned.replace(/^\+/, ''); // wa.me needs no +
        const encoded = encodeURIComponent(text);
        return `https://wa.me/${cleaned}?text=${encoded}`;
    }

    try {
        const message = makeOrderMessage(ordenActual);
        const phone = ordenActual.cliente.whatsapp || window.rifaplusConfig.numeroWhatsappOrganizador;
        const waUrl = buildWaMeUrl(phone, message);

        // Open wa.me in new tab
        window.open(waUrl, '_blank');

        // Guardar que se inició el envío desde el cliente
        const confirmacion = {
            ...ordenActual,
            estado: 'pendiente_envio_por_usuario',
            fechaEnvioIntento: new Date().toISOString()
        };
        localStorage.setItem('rifaplus_orden_confirmada', JSON.stringify(confirmacion));

        rifaplusUtils.showFeedback('✅ Abriendo WhatsApp para enviar la orden. Confirma el envío en la app.', 'success');
        setTimeout(() => {
            cerrarOrdenFormal();
            window.location.href = 'index.html';
        }, 1500);
    } catch (error) {
        console.error('Error al abrir WhatsApp:', error);
        rifaplusUtils.showFeedback(`❌ Error: ${error.message}`, 'error');
    }
}

// Funciones removidas (no utilizadas en versión actual):
// - generarPdfDeOrden: Las órdenes ahora se renderizan en servidor (GET /api/ordenes/:id)
// - descargarBlob: Ya no necesario sin descarga de PDF

async function enviarOrdenPorWhatsApp() {
        if (!ordenActual) {
                rifaplusUtils.showFeedback('❌ Error: No hay orden para enviar', 'error');
                return;
        }

        try {
                // Guardar orden en backend para obtener URL viewable
                const guardarResp = await fetch(`${window.rifaplusConfig.apiEndpoint}/ordenes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ordenActual)
                });

                const guardarJson = await guardarResp.json();
                if (!guardarJson.success) throw new Error('No se pudo guardar la orden');

                const ordenUrl = guardarJson.url;

                // Construir mensaje completo para el ORGANIZADOR
                function makeOrganizerOrderMessage(ord, linkUrl) {
                    const cliente = ord.cliente || {};
                    const ordenId = ord.ordenId || '';
                    const banco = ord.cuenta ? ord.cuenta.bank : '';
                    const monto = ord.totales ? (ord.totales.totalFinal || ord.totales.total || 0) : 0;
                    const cantidadBoletos = (ord.boletos || []).length;
                    const clienteWhatsapp = cliente.whatsapp || 'N/A';
                    
                    const lines = [
                        '🎯 NUEVA ORDEN DE PAGO - RIFA',
                        '',
                        '📋 *DATOS DEL CLIENTE:*',
                        `Nombre: ${cliente.nombre || ''} ${cliente.apellidos || ''}`,
                        `WhatsApp: ${clienteWhatsapp}`,
                        `Orden: ${ordenId}`,
                        '',
                        '🎫 *DETALLES DE COMPRA:*',
                        `Cantidad de boletos: ${cantidadBoletos}`,
                        `Banco: ${banco}`,
                        `Monto total: $${monto}`,
                        '',
                        '💳 *TRANSFERENCIA REQUERIDA:*',
                        `Beneficiario: ${ord.cuenta.beneficiary}`,
                        `Cuenta: ${ord.cuenta.accountNumber}`,
                        `Referencia: ${ord.referencia}`,
                        '',
                        `📄 Ver orden completa: ${linkUrl}`,
                        '',
                        '⏳ *ESTADO:* Pendiente de confirmación de pago',
                        '📎 Espera el comprobante de transferencia'
                    ];
                    return lines.join('\n');
                }

                function buildWaMeUrl(phone, text) {
                    if (!phone) phone = '';
                    let cleaned = phone.replace(/[^0-9+]/g, '');
                    cleaned = cleaned.replace(/^\+/, '');
                    const encoded = encodeURIComponent(text);
                    return `https://wa.me/${cleaned}?text=${encoded}`;
                }

                // Enviar al número del ORGANIZADOR
                const phone = window.rifaplusConfig.numeroWhatsappOrganizador;
                const organizerMessage = makeOrganizerOrderMessage(ordenActual, ordenUrl);
                const waUrl = buildWaMeUrl(phone, organizerMessage);
                
                // Abrir wa.me en nueva pestaña
                window.open(waUrl, '_blank');

                // Guardar la orden en el almacenamiento del admin
                const ordenes = JSON.parse(localStorage.getItem('rifaplus_ordenes_admin') || '[]');
                const nuevaOrden = {
                    ...ordenActual,
                    estado: 'pendiente',
                    fecha: new Date().toISOString(),
                    linkOrden: ordenUrl
                };
                ordenes.push(nuevaOrden);
                localStorage.setItem('rifaplus_ordenes_admin', JSON.stringify(ordenes));

                // Guardar confirmación
                const confirmacion = {
                        ...ordenActual,
                        estado: 'pendiente_envio_por_usuario',
                        fechaEnvioIntento: new Date().toISOString(),
                        linkOrden: ordenUrl
                };
                localStorage.setItem('rifaplus_orden_confirmada', JSON.stringify(confirmacion));

                rifaplusUtils.showFeedback('✅ Abriendo WhatsApp para enviar la orden. Confirma el envío en la app.', 'success');
                setTimeout(() => {
                        cerrarOrdenFormal();
                        window.location.href = 'index.html';
                }, 1500);

        } catch (error) {
                console.error('Error al preparar el envío por WhatsApp:', error);
                rifaplusUtils.showFeedback(`❌ Error: ${error.message}`, 'error');
        }
}
// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const btnCancelarOrdenFormal = document.getElementById('btnCancelarOrdenFormal');
    const btnContinuarOrdenFormal = document.getElementById('btnContinuarOrdenFormal');
    const closeOrdenFormal = document.getElementById('closeOrdenFormal');
    const modalOrdenFormal = document.getElementById('modalOrdenFormal');

    if (btnCancelarOrdenFormal) {
        btnCancelarOrdenFormal.addEventListener('click', cerrarOrdenFormal);
    }

    if (btnContinuarOrdenFormal) {
        btnContinuarOrdenFormal.addEventListener('click', enviarOrdenPorWhatsApp);
    }

    if (closeOrdenFormal) {
        closeOrdenFormal.addEventListener('click', cerrarOrdenFormal);
    }

    // Cerrar al hacer click fuera
    if (modalOrdenFormal) {
        modalOrdenFormal.addEventListener('click', function(e) {
            if (e.target === modalOrdenFormal) {
                cerrarOrdenFormal();
            }
        });
    }
});
