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
            estado: cliente.estado || '',
            ciudad: cliente.ciudad || ''
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
        day: 'numeric'
    });
    const horaFormato = fecha.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const logoUrl = 'images/sorteos-yepe-logo.png';
    const nombreOrganizador = window.rifaplusConfig?.nombreOrganizador || 'Organizador';
    
    // Obtener todos los boletos (sin compactar - mostrar todos los números)
    const boletosArray = (orden.boletos || []).map(b => Number(b)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    const boletosStr = boletosArray.join(', ');
    
    // Totales
    const subtotal = orden.totales?.subtotal || 0;
    const descuento = orden.totales?.descuento || 0;
    const total = orden.totales?.totalFinal || orden.totales?.subtotal || 0;

    const html = `
        <div class="orden-documento" id="documentoPDF" style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue'; color:#111; padding:24px; max-width:100%; background:white;">
            
            <!-- ENCABEZADO: Logo Grande + Nombre Organizador (Izquierda) + ID Orden (Derecha) -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:24px; padding-bottom:16px; border-bottom:3px solid #7C3AED;">
                <div style="display:flex; flex-direction:column; align-items:flex-start; gap:8px;">
                    <img src="${logoUrl}" alt="logo" style="height:120px; width:auto; object-fit:contain;" />
                    <div style="font-weight:800; font-size:1.15rem; line-height:1.2; color:#111;">${nombreOrganizador}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.85rem; color:#6B7280; font-weight:600; text-transform:uppercase; margin-bottom:4px;">Orden de Pago</div>
                    <div style="font-weight:900; font-family: 'Courier New', monospace; font-size:1.4rem; color:#7C3AED; white-space:nowrap; margin-bottom:12px;">${orden.ordenId}</div>
                    <div style="font-size:0.8rem; color:#6B7280; margin-bottom:2px;">📅 ${fechaFormato}</div>
                    <div style="font-size:0.8rem; color:#6B7280;">⏰ ${horaFormato}</div>
                </div>
            </div>

            <!-- DATOS DEL CLIENTE -->
            <div style="margin-bottom:20px;">
                <div style="font-weight:700; font-size:0.95rem; margin-bottom:10px; color:#111; text-transform:uppercase; font-size:0.9rem; letter-spacing:0.5px;">Datos del Cliente</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; font-size:0.9rem; background:#F9FAFB; padding:12px; border-radius:6px;">
                    <div>
                        <div style="color:#6B7280; font-size:0.8rem; font-weight:600; margin-bottom:2px;">Nombre</div>
                        <div style="font-weight:600;">${orden.cliente.nombre || '-'}</div>
                    </div>
                    <div>
                        <div style="color:#6B7280; font-size:0.8rem; font-weight:600; margin-bottom:2px;">Apellidos</div>
                        <div style="font-weight:600;">${orden.cliente.apellidos || '-'}</div>
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <div style="color:#6B7280; font-size:0.8rem; font-weight:600; margin-bottom:2px;">WhatsApp</div>
                        <div style="font-weight:600;">${orden.cliente.whatsapp || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- RESUMEN DE COMPRA -->
            <div style="margin-bottom:20px;">
                <div style="font-weight:700; font-size:0.95rem; margin-bottom:10px; color:#111; text-transform:uppercase; font-size:0.9rem; letter-spacing:0.5px;">Resumen de Compra</div>
                <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:6px; padding:14px; font-size:0.9rem;">
                    <div style="margin-bottom:12px;">
                        <div style="color:#6B7280; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Boletos Adquiridos (${boletosArray.length})</div>
                        <div style="font-family: 'Courier New', monospace; font-size:0.85rem; color:#111; line-height:1.5; word-wrap:break-word; white-space:normal;">${boletosStr}</div>
                    </div>
                    <div style="border-top:2px solid #E5E7EB; padding-top:12px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.9rem;">
                            <span style="color:#6B7280;">Subtotal:</span>
                            <span style="font-weight:600;">$${Number(subtotal).toFixed(2)}</span>
                        </div>
                        ${descuento > 0 ? `
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.9rem;">
                            <span style="color:#6B7280;">Descuento:</span>
                            <span style="font-weight:600; color:#10B981;">-$${Number(descuento).toFixed(2)}</span>
                        </div>
                        ` : ''}
                        <div style="display:flex; justify-content:space-between; font-weight:900; font-size:1.15rem; color:#111; background:linear-gradient(135deg, #7C3AED15 0%, #6D28D915 100%); padding:8px; border-radius:4px;">
                            <span>TOTAL A PAGAR:</span>
                            <span style="color:#7C3AED;">$${Number(total).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MÉTODO DE PAGO -->
            <div style="margin-bottom:20px;">
                <div style="font-weight:700; font-size:0.95rem; margin-bottom:10px; color:#111; text-transform:uppercase; font-size:0.9rem; letter-spacing:0.5px;">Información de Pago</div>
                <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:6px; padding:14px; font-size:0.9rem;">
                    <div style="margin-bottom:10px;">
                        <div style="color:#6B7280; font-size:0.8rem; font-weight:600; margin-bottom:2px;">Banco</div>
                        <div style="font-weight:700; font-size:1rem;">${orden.cuenta?.bank || '-'}</div>
                    </div>
                    <div style="margin-bottom:10px;">
                        <div style="color:#6B7280; font-size:0.8rem; font-weight:600; margin-bottom:2px;">Número de Cuenta</div>
                        <div style="font-family: 'Courier New', monospace; font-weight:700; font-size:0.95rem;">${orden.cuenta?.accountNumber || '-'}</div>
                    </div>
                    <div style="margin-bottom:10px;">
                        <div style="color:#6B7280; font-size:0.8rem; font-weight:600; margin-bottom:2px;">Referencia de Pago</div>
                        <div style="font-family: 'Courier New', monospace; font-weight:700; font-size:0.95rem;">${orden.referencia || '-'}</div>
                    </div>
                    <div>
                        <div style="color:#6B7280; font-size:0.8rem; font-weight:600; margin-bottom:2px;">Beneficiario</div>
                        <div style="font-weight:600;">${orden.cuenta?.beneficiary || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- MENSAJE FINAL -->
            <div style="text-align:center; background:linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); color:white; border-radius:8px; padding:18px; font-size:0.95rem;">
                <div style="font-weight:700; margin-bottom:6px; font-size:1rem;">✉️ Próximo Paso</div>
                <div style="font-size:0.9rem; opacity:0.95; line-height:1.5;">Realiza la transferencia y envía el comprobante para confirmar tu compra. <br><strong>¡Mucha suerte! 🍀</strong></div>
            </div>
        </div>
    `;

    contenedor.innerHTML = html;
}

// Build message text
function makeOrderMessage(ord) {
    const cliente = ord.cliente || {};
    const ordenId = ord.ordenId || '';
    const banco = ord.cuenta ? ord.cuenta.bank : '';
    const cuenta = ord.cuenta ? ord.cuenta.accountNumber : '';
    const beneficiario = ord.cuenta ? ord.cuenta.beneficiary : '';
    const referencia = ord.referencia || '';
    const subtotal = ord.totales ? (ord.totales.subtotal || 0) : 0;
    const descuento = ord.totales ? (ord.totales.descuento || 0) : 0;
    const monto = ord.totales ? (ord.totales.totalFinal || ord.totales.subtotal || 0) : 0;
    const boletos = ord.boletos || [];
    
    // Compactar boletos: devolver siempre todos los rangos (no truncar)
    function compactRanges(arr) {
        if (!Array.isArray(arr) || arr.length === 0) return '-';
        const nums = arr.slice().map(n => Number(n)).filter(n => !isNaN(n)).sort((a,b) => a - b);
        const ranges = [];
        let start = nums[0], end = nums[0];
        for (let i = 1; i < nums.length; i++) {
            const n = nums[i];
            if (n === end || n === end + 1) {
                end = n;
            } else {
                ranges.push(start === end ? String(start) : `${start}-${end}`);
                start = n;
                end = n;
            }
        }
        ranges.push(start === end ? String(start) : `${start}-${end}`);
        return ranges.join(',');
    }
    
    const compactBoletosStr = compactRanges(boletos);
    const fecha = new Date(ord.fecha);
    const fechaFormato = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const misBoletosUrl = cliente.whatsapp ? `${origin}/mis-boletos.html?whatsapp=${encodeURIComponent(cliente.whatsapp)}` : `${origin}/mis-boletos.html`;

    return `ORDEN DE PAGO
ID de orden: ${ordenId}
Emitida: ${fechaFormato}

DATOS DEL CLIENTE
Nombre: ${cliente.nombre || ''} ${cliente.apellidos || ''}
WhatsApp: ${cliente.whatsapp || '-'}
Estado: ${cliente.estado || '-'}
Ciudad: ${cliente.ciudad || '-'}

DETALLES DE COMPRA
Boletos: ${compactBoletosStr}
Subtotal: $${Number(subtotal).toFixed(2)}
${descuento > 0 ? `Descuento: -$${Number(descuento).toFixed(2)}\n` : ''}Total a pagar: $${Number(monto).toFixed(2)}

MÉTODO DE PAGO
Banco: ${banco}
Número de cuenta: ${cuenta}
Referencia: ${referencia}
Beneficiario: ${beneficiario}

Ver tu orden y el estado de tus boletos: ${misBoletosUrl}

------------------------------
Por favor, envía el comprobante de pago para confirmar la compra de tus boletos y asegurar tu participación en la rifa.
¡Mucha suerte! Tu participación es muy importante y pronto podrías ser el ganador. 🎉`;
}

function buildWaMeUrl(phone, text) {
    if (!phone) phone = '';
    let cleaned = phone.replace(/[^0-9+]/g, '');
    cleaned = cleaned.replace(/^\+/, ''); // wa.me needs no +
    const encoded = encodeURIComponent(text);
    return `https://wa.me/${cleaned}?text=${encoded}`;
}

function imprimirOrden() {
    // Generate PDF client-side using html2canvas + jsPDF and trigger download
    const docEl = document.getElementById('documentoPDF');
    if (!docEl) {
        rifaplusUtils.showFeedback('❌ No hay documento para descargar', 'error');
        return;
    }

    try {
        if (typeof window.html2canvas !== 'function') {
            rifaplusUtils.showFeedback('❌ html2canvas no está disponible', 'error');
            console.error('html2canvas is not available. Ensure the script is loaded correctly.');
            return;
        }
        if (!window.jspdf || typeof window.jspdf.jsPDF !== 'function') {
            rifaplusUtils.showFeedback('❌ jsPDF no está disponible', 'error');
            return;
        }
        
        const scale = 2;
        window.html2canvas(docEl, { scale }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = { width: canvas.width, height: canvas.height };
            const imgWidthMM = pdfWidth;
            const imgHeightMM = (imgProps.height * imgWidthMM) / imgProps.width;
            
            if (imgHeightMM <= pdfHeight) {
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMM, imgHeightMM);
            } else {
                let position = 0;
                const pageHeightPx = (imgProps.width * pdfHeight) / imgWidthMM;
                while (position < imgProps.height) {
                    const canvasSlice = document.createElement('canvas');
                    canvasSlice.width = imgProps.width;
                    canvasSlice.height = Math.min(pageHeightPx, imgProps.height - position);
                    const ctx = canvasSlice.getContext('2d');
                    ctx.drawImage(canvas, 0, position, imgProps.width, canvasSlice.height, 0, 0, imgProps.width, canvasSlice.height);
                    const sliceData = canvasSlice.toDataURL('image/png');
                    const sliceHeightMM = (canvasSlice.height * imgWidthMM) / imgProps.width;
                    pdf.addImage(sliceData, 'PNG', 0, 0, imgWidthMM, sliceHeightMM);
                    position += canvasSlice.height;
                    if (position < imgProps.height) pdf.addPage();
                }
            }
            const filename = `orden-${ordenActual ? ordenActual.ordenId : Date.now()}.pdf`;
            pdf.save(filename);
            rifaplusUtils.showFeedback('✅ PDF descargado', 'success');
        }).catch(err => {
            console.error('Error al generar PDF:', err);
            rifaplusUtils.showFeedback('❌ Error al generar PDF', 'error');
        });
    } catch (err) {
        console.error('Error al generar PDF:', err);
        rifaplusUtils.showFeedback('❌ Error al generar PDF', 'error');
    }
}

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
        
        // Manejar conflicto de boletos (409)
        if (guardarResp.status === 409 && guardarJson.boletosConflicto) {
            const boletosEnConflicto = guardarJson.boletosConflicto.join(', ');
            const mensaje = `❌ Los boletos ${boletosEnConflicto} ya fueron comprados por otro cliente.\n\nPor favor, selecciona números diferentes.`;
            rifaplusUtils.showFeedback(mensaje, 'error');
            
            // Volver a la pantalla de selección de boletos
            cerrarOrdenFormal();
            
            // Remover boletos en conflicto de la selección
            const boletoSeleccionados = new Set(
                JSON.parse(localStorage.getItem('rifaplusSelectedNumbers') || '[]')
            );
            guardarJson.boletosConflicto.forEach(boleto => {
                boletoSeleccionados.delete(boleto);
            });
            localStorage.setItem('rifaplusSelectedNumbers', JSON.stringify(Array.from(boletoSeleccionados)));
            
            // Actualizar UI si estamos en compra.html
            if (typeof actualizarContadorCarritoGlobal === 'function') {
                actualizarContadorCarritoGlobal();
            }
            if (typeof fetchBoletosPublic === 'function') {
                fetchBoletosPublic();
            }
            
            return;
        }
        
        if (!guardarJson.success) throw new Error('No se pudo guardar la orden');

        const ordenUrl = guardarJson.url;

        // Construir mensaje completo para el ORGANIZADOR - VERSIÓN ACTUALIZADA
        function makeOrganizerOrderMessage(ord, linkUrl) {
            const cliente = ord.cliente || {};
            const ordenId = ord.ordenId || '';
            const banco = ord.cuenta ? ord.cuenta.bank : '';
            const cuenta = ord.cuenta ? ord.cuenta.accountNumber : '';
            const beneficiario = ord.cuenta ? ord.cuenta.beneficiary : '';
            const referencia = ord.referencia || '';
            const monto = ord.totales ? (ord.totales.totalFinal || ord.totales.subtotal || 0) : 0;
            const boletos = ord.boletos || [];
            
            // Función para compactar boletos (no truncada)
            function compactRanges(arr) {
                if (!Array.isArray(arr) || arr.length === 0) return '-';
                const nums = arr.slice().map(n => Number(n)).filter(n => !isNaN(n)).sort((a,b) => a - b);
                const ranges = [];
                let start = nums[0], end = nums[0];
                for (let i = 1; i < nums.length; i++) {
                    const n = nums[i];
                    if (n === end || n === end + 1) {
                        end = n;
                    } else {
                        ranges.push(start === end ? String(start) : `${start}-${end}`);
                        start = n;
                        end = n;
                    }
                }
                ranges.push(start === end ? String(start) : `${start}-${end}`);
                return ranges.join(',');
            }
            
            const compactBoletosStr = compactRanges(boletos, 90);
            
            const lines = [
                '🎟️ *ORDEN DE PAGO - RIFA* 🎟️',
                '',
                '📋 *INFORMACIÓN DE LA ORDEN*',
                `🆔 ID de Orden: ${ordenId}`,
                `👤 Cliente: ${cliente.nombre || ''} ${cliente.apellidos || ''}`,
                `📞 WhatsApp: ${cliente.whatsapp || 'No proporcionado'}`,
                '',
                '🎫 *BOLETOS SELECCIONADOS*',
                `📊 Números: ${compactBoletosStr}`,
                `💰 Total a Pagar: $${Number(monto).toFixed(2)}`,
                '',
                '🏦 *DATOS PARA TRANSFERENCIA*',
                `🏛️ Banco: ${banco}`,
                `🔢 Número de Cuenta: ${cuenta}`,
                `📌 Referencia: ${referencia}`,
                `👤 Beneficiario: ${beneficiario}`,
                '',
                '📝 *INSTRUCCIONES IMPORTANTES*',
                '1. Realiza la transferencia por el monto exacto',
                '2. Toma una captura de pantalla del comprobante',
                '3. Envía el comprobante a este mismo chat',
                '4. Tu compra se confirmará una vez verificado el pago',
                '',
                '🌟 *¡NO TE QUEDES FUERA!* 🌟',
                'Tu participación está a solo un paso de hacerse realidad. ¡Envía tu comprobante y asegura tu oportunidad de ganar! 🏆',
                '¡La suerte podría estar de tu lado! 🍀'
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
        
        // 🔥 LIMPIAR CARRITO DESPUÉS DE ENVIAR ORDEN
        // Remover boletos del localStorage para que no se vuelvan a comprar
        localStorage.removeItem('rifaplusSelectedNumbers');
        localStorage.setItem('rifaplusOrdenEnviada', 'true'); // Marcador para limpiar en reload
        if (typeof selectedNumbersGlobal !== 'undefined' && selectedNumbersGlobal.clear) {
            selectedNumbersGlobal.clear();
        }
        
        // Actualizar UI del carrito
        if (typeof actualizarVistaCarritoGlobal === 'function') {
            actualizarVistaCarritoGlobal();
        }
        if (typeof actualizarContadorCarritoGlobal === 'function') {
            actualizarContadorCarritoGlobal();
        }
        
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
    const btnDescargarOrdenFormal = document.getElementById('btnDescargarOrdenFormal');

    if (btnCancelarOrdenFormal) {
        btnCancelarOrdenFormal.addEventListener('click', cerrarOrdenFormal);
    }
    if (btnContinuarOrdenFormal) {
        btnContinuarOrdenFormal.addEventListener('click', enviarOrdenPorWhatsApp);
    }

    if (btnDescargarOrdenFormal) {
        btnDescargarOrdenFormal.addEventListener('click', function() {
            imprimirOrden();
        });
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

    // Ensure the PDF generation works when the download button is clicked
    if (btnDescargarOrdenFormal) {
        btnDescargarOrdenFormal.addEventListener('click', () => {
            const docEl = document.getElementById('documentoPDF');
            if (!docEl) {
                rifaplusUtils.showFeedback('❌ No hay documento para descargar', 'error');
                return;
            }

            // Check if html2canvas and jsPDF are available
            if (typeof window.html2canvas !== 'function') {
                rifaplusUtils.showFeedback('❌ html2canvas no está disponible', 'error');
                console.error('html2canvas is not available. Ensure the script is loaded correctly.');
                return;
            }
            if (!window.jspdf || typeof window.jspdf.jsPDF !== 'function') {
                rifaplusUtils.showFeedback('❌ jsPDF no está disponible', 'error');
                console.error('jsPDF is not available. Ensure the script is loaded correctly.');
                return;
            }

            // Generate the PDF
            const scale = 2;
            window.html2canvas(docEl, { scale }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new window.jspdf.jsPDF();
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save('orden.pdf');
                rifaplusUtils.showFeedback('✅ PDF descargado con éxito', 'success');
            }).catch(err => {
                rifaplusUtils.showFeedback('❌ Error al generar el PDF', 'error');
                console.error('Error generating PDF:', err);
            });
        });
    }
});