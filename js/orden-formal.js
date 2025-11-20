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
            email: cliente.email || `${cliente.whatsapp.replace(/[^0-9]/g,'') || Date.now()}@noemail.local`,
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
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Compact formal layout: logo left, ordenId right, compact client info, concepto y total, payment method (bank, account, referencia, beneficiary)
    // Logo solo para la orden de pago PDF
    const logoUrl = 'images/sorteos-yepe-logo.png';
    const cantidadBoletos = (orden.boletos || []).length;
    
    // Compact representation of boletos (ranges)
    function compactRanges(arr, maxLen = 80) {
        if (!Array.isArray(arr) || arr.length === 0) return '';
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
        let out = ranges.join(',');
        if (out.length > maxLen) {
            // try to fit partial output and show total count
            const parts = [];
            let len = 0;
            for (const r of ranges) {
                if (len + r.length + (parts.length > 0 ? 1 : 0) > maxLen - 10) break;
                parts.push(r);
                len += r.length + (parts.length > 1 ? 1 : 0);
            }
            const partsCount = parts.reduce((s, p) => s + (p.includes('-') ? (Number(p.split('-')[1]) - Number(p.split('-')[0]) + 1) : 1), 0);
            out = parts.join(',') + `... (+${nums.length - partsCount} más)`;
        }
        return out;
    }

    const compactBoletosStr = compactRanges(orden.boletos || [], 90);
    const concepto = `Boletos: ${compactBoletosStr}`;
    const total = (orden.totales && (orden.totales.totalFinal || orden.totales.subtotal)) ? (orden.totales.totalFinal || orden.totales.subtotal) : 0;

    const html = `
        <div class="orden-documento" id="documentoPDF" style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue'; color:#111; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${logoUrl}" alt="logo" style="height:144px; width:auto; object-fit:contain;" />
                    <div style="font-weight:700; font-size:0.95rem;">${window.rifaplusConfig.nombreOrganizador || 'RifaPlus'}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.75rem; color:#6B7280;">Orden</div>
                    <div style="font-weight:800; font-family: 'Courier New', monospace;">${orden.ordenId}</div>
                </div>
            </div>

            <div style="margin-top:10px; display:flex; gap:10px; align-items:center; justify-content:space-between;">
                <div style="font-size:0.9rem;">
                    <div style="font-weight:700;">${orden.cliente.nombre || ''} ${orden.cliente.apellidos || ''}</div>
                    <div style="font-size:0.85rem; color:#6B7280;">${orden.cliente.whatsapp || '-'}</div>
                </div>
                <div style="font-size:0.85rem; color:#6B7280;">Emitida: ${fechaFormato}</div>
            </div>

            <div style="margin-top:12px; padding:10px 0; border-top:1px solid #F3F4F6; border-bottom:1px solid #F3F4F6; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div style="font-size:0.85rem; color:#374151; max-width:70%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${concepto}</div>
                <div style="font-weight:800; font-size:1rem; color:#111;">$${Number(total).toFixed(2)}</div>
            </div>

            <div style="margin-top:10px;">
                <div style="font-weight:700; font-size:0.9rem; margin-bottom:6px;">Método de pago</div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <div style="font-weight:700;">${orden.cuenta.bank || '-'}</div>
                    <div style="font-family: 'Courier New', monospace; font-size:0.95rem;">${orden.cuenta.accountNumber || '-'}</div>
                    <div style="font-size:0.88rem; color:#6B7280;">Referencia: ${orden.referencia}</div>
                    <div style="font-size:0.88rem; color:#374151;">Beneficiario: ${orden.cuenta.beneficiary || '-'}</div>
                </div>
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
    const monto = ord.totales ? (ord.totales.totalFinal || ord.totales.subtotal || 0) : 0;
    const boletos = ord.boletos || [];
    
    // Compactar boletos igual que en la orden visual
    function compactRanges(arr, maxLen = 90) {
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
        let out = ranges.join(',');
        if (out.length > maxLen) {
            const parts = [];
            let len = 0;
            for (const r of ranges) {
                if (len + r.length + (parts.length > 0 ? 1 : 0) > maxLen - 10) break;
                parts.push(r);
                len += r.length + (parts.length > 1 ? 1 : 0);
            }
            const partsCount = parts.reduce((s, p) => s + (p.includes('-') ? (Number(p.split('-')[1]) - Number(p.split('-')[0]) + 1) : 1), 0);
            out = parts.join(',') + `... (+${nums.length - partsCount} más)`;
        }
        return out;
    }
    
    const compactBoletosStr = compactRanges(boletos, 90);
    const fecha = new Date(ord.fecha);
    const fechaFormato = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `ORDEN DE PAGO
------------------------------
ID de orden: ${ordenId}
Emitida: ${fechaFormato}

DATOS DEL CLIENTE
Nombre: ${cliente.nombre || ''} ${cliente.apellidos || ''}
WhatsApp: ${cliente.whatsapp || '-'}
Email: ${cliente.email || '-'}
Estado: ${cliente.estado || '-'}
Ciudad: ${cliente.ciudad || '-'}

DETALLES DE COMPRA
Boletos: ${compactBoletosStr}
Total a pagar: $${Number(monto).toFixed(2)}

MÉTODO DE PAGO
Banco: ${banco}
Número de cuenta: ${cuenta}
Referencia: ${referencia}
Beneficiario: ${beneficiario}

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
        // Debugging: Check if html2canvas is loaded
        console.log('Checking if html2canvas is available:', typeof window.html2canvas);

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
            
            // Función para compactar boletos (la misma que usas en la orden)
            function compactRanges(arr, maxLen = 90) {
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
                let out = ranges.join(',');
                if (out.length > maxLen) {
                    const parts = [];
                    let len = 0;
                    for (const r of ranges) {
                        if (len + r.length + (parts.length > 0 ? 1 : 0) > maxLen - 10) break;
                        parts.push(r);
                        len += r.length + (parts.length > 1 ? 1 : 0);
                    }
                    const partsCount = parts.reduce((s, p) => s + (p.includes('-') ? (Number(p.split('-')[1]) - Number(p.split('-')[0]) + 1) : 1), 0);
                    out = parts.join(',') + `... (+${nums.length - partsCount} más)`;
                }
                return out;
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