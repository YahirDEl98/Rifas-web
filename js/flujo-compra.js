// flujo-compra.js - Orquesta el flujo de compra completo en compra.html
// Formulario → Selección de cuenta → Orden Formal (sin redirecciones)

let clienteCheckout = null;

document.addEventListener('DOMContentLoaded', function() {
    inicializarFlujoCompra();
});

function inicializarFlujoCompra() {
    const btnProcederCarrito = document.getElementById('btnProcederCarrito');
    if (btnProcederCarrito) {
        btnProcederCarrito.addEventListener('click', iniciarFlujoPago);
    }
}

// Paso 1: Inicia el flujo abriendo el modal de contacto
function iniciarFlujoPago() {
    // Cerrar carrito si está abierto
    const carritoModal = document.getElementById('carritoModal');
    if (carritoModal && carritoModal.classList && carritoModal.classList.contains('active')) {
        carritoModal.classList.remove('active');
    }
    
    // Activar modo flujo para que modal-contacto no redirija
    window.rifaplusFlujoPago = true;
    
    // Definir callback que se ejecuta cuando el usuario confirma el formulario
    window.onContactoConfirmado = function() {
        // El cliente ya está guardado en localStorage por modal-contacto.js
        // Cargar datos
        clienteCheckout = obtenerClienteDelStorage();
        
        // Cerrar modal de contacto
        if (typeof cerrarModalContacto === 'function') {
            cerrarModalContacto();
        }
        
        // Paso 2: Abrir selector de cuenta de pago
        setTimeout(() => {
            abrirModalSeleccionCuenta();
        }, 300);
    };
    
    // Abrir modal de contacto
    if (typeof abrirModalContacto === 'function') {
        abrirModalContacto();
    }
}

// Paso 2: Modal para seleccionar cuenta de pago
function abrirModalSeleccionCuenta() {
    const modal = document.getElementById('modalSeleccionCuenta');
    if (!modal) {
        console.error('modalSeleccionCuenta no encontrado');
        return;
    }
    
    // Poblar cuentas
    const cuentasContainer = document.getElementById('cuentasLista');
    if (!cuentasContainer) {
        console.error('cuentasLista no encontrado');
        return;
    }
    
    const cuentas = (window.rifaplusConfig && window.rifaplusConfig.bankAccounts) 
        ? window.rifaplusConfig.bankAccounts 
        : [];
    
    if (cuentas.length === 0) {
        cuentasContainer.innerHTML = '<p style="color: red;">No hay cuentas de pago disponibles</p>';
        return;
    }
    
    // Renderizar cuentas como radio buttons
    let html = '';
    cuentas.forEach((cuenta, idx) => {
        const id = `cuenta_${idx}`;
        html += `
            <div class="metodo-pago-item">
                <input type="radio" id="${id}" name="cuentaPago" value="${idx}" data-cuenta-idx="${idx}">
                <label for="${id}">
                    <div>
                        <div class="metodo-pago-nombre">${cuenta.bank || cuenta.banco || 'Banco'}</div>
                        <div class="metodo-pago-detalle">${cuenta.accountNumber || cuenta.numero || '****'}</div>
                        <div class="metodo-pago-titular">${cuenta.beneficiary || cuenta.titular || ''}</div>
                    </div>
                </label>
            </div>
        `;
    });
    
    cuentasContainer.innerHTML = html;
    
    // Agregar event listeners a los radios
    const radios = cuentasContainer.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
        radio.addEventListener('change', function() {
            const cuentaIdx = parseInt(this.value);
            const cuentaSeleccionada = cuentas[cuentaIdx];
            
            // Cerrar selector
            cerrarModalSeleccionCuenta();
            
            // Paso 3: Generar y mostrar orden formal
            setTimeout(() => {
                mostrarOrdenFormal(cuentaSeleccionada);
            }, 300);
        });
    });
    
    // Mostrar modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Event listener para cerrar
    const closeBtn = document.getElementById('closeModalSeleccionCuenta');
    if (closeBtn) {
        closeBtn.onclick = cerrarModalSeleccionCuenta;
    }
    
    // Cerrar al hacer click en el overlay
    modal.onclick = function(e) {
        if (e.target === modal) {
            cerrarModalSeleccionCuenta();
        }
    };
}

function cerrarModalSeleccionCuenta() {
    const modal = document.getElementById('modalSeleccionCuenta');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Paso 3: Mostrar orden formal
function mostrarOrdenFormal(cuenta) {
    if (!clienteCheckout) {
        console.error('No hay datos de cliente');
        return;
    }
    
    // Obtener boletos seleccionados
    const boletos = obtenerBoletosSelecionados();
    if (!boletos || boletos.length === 0) {
        alert('Error: No hay boletos seleccionados');
        return;
    }
    
    // Guardar datos para orden-formal.js (sin email)
    localStorage.setItem('rifaplus_cliente', JSON.stringify({
        nombre: clienteCheckout.nombre || '',
        apellidos: clienteCheckout.apellidos || clienteCheckout.apellido || '',
        whatsapp: clienteCheckout.whatsapp || '',
        estado: clienteCheckout.estado || '',
        ciudad: clienteCheckout.ciudad || '',
        ordenId: clienteCheckout.ordenId || `RIFA-${Date.now()}`
    }));
    
    localStorage.setItem('rifaplus_boletos', JSON.stringify(boletos));
    
    // Guardar totales
    const precioUnitario = (window.rifaplusConfig && window.rifaplusConfig.ticketPrice) 
        ? Number(window.rifaplusConfig.ticketPrice) 
        : 50;
    const totales = calcularTotales(boletos.length, precioUnitario);
    
    localStorage.setItem('rifaplus_total', JSON.stringify({
        subtotal: totales.subtotal,
        descuento: totales.descuentoMonto,
        totalFinal: totales.totalFinal
    }));
    
    // Crear objeto de orden para orden-formal
    const orden = {
        ordenId: clienteCheckout.ordenId || `RIFA-${Date.now()}`,
        cliente: {
            nombre: clienteCheckout.nombre || '',
            apellidos: clienteCheckout.apellidos || clienteCheckout.apellido || '',
            whatsapp: clienteCheckout.whatsapp || '',
            estado: clienteCheckout.estado || '',
            ciudad: clienteCheckout.ciudad || ''
        },
        cuenta: cuenta,
        boletos: boletos,
        totales: totales,
        fecha: new Date().toISOString(),
        referencia: clienteCheckout.ordenId || `RIFA-${Date.now()}`
    };
    
    localStorage.setItem('rifaplus_orden_actual', JSON.stringify(orden));
    
    // Usar función de orden-formal.js si está disponible
    if (typeof window.abrirOrdenFormal === 'function') {
        try {
            window.abrirOrdenFormal(cuenta);
        } catch (e) {
            console.error('Error al abrir orden formal:', e);
            mostrarOrdenFormalManual(orden);
        }
    } else {
        console.warn('abrirOrdenFormal no disponible, usando renderizado manual');
        mostrarOrdenFormalManual(orden);
    }
}

// Renderizar orden formal si orden-formal.js no está disponible
function mostrarOrdenFormalManual(orden) {
    const modal = document.getElementById('modalOrdenFormal');
    if (!modal) {
        alert('No hay modal de orden disponible');
        return;
    }
    
    const contenedor = document.getElementById('contenidoOrdenFormal');
    if (!contenedor) {
        alert('No hay contenedor para la orden');
        return;
    }
    
    // Renderizar contenido (usar template similar a orden-formal.js)
    const fecha = new Date(orden.fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const concepto = `Boletos: ${orden.boletos.join(', ')}`;
    const monto = orden.totales.totalFinal || orden.totales.subtotal || 0;
    
    const html = `
        <div class="orden-documento" id="documentoPDF" style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue'; color:#111; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="images/sorteos-yepe-logo.png" alt="logo" style="height:144px; width:auto; object-fit:contain;" />
                    <div style="font-weight:700; font-size:0.95rem;">${window.rifaplusConfig?.nombreOrganizador || 'RifaPlus'}</div>
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
                <div style="font-size:0.85rem; color:#6B7280;">Emitida: ${fecha}</div>
            </div>

            <div style="margin-top:12px; padding:10px 0; border-top:1px solid #F3F4F6; border-bottom:1px solid #F3F4F6; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div style="font-size:0.85rem; color:#374151; max-width:70%; white-space:normal; overflow-wrap:break-word; word-break:break-word;">${concepto}</div>
                <div style="font-weight:800; font-size:1rem; color:#111;">$${Number(monto).toFixed(2)}</div>
            </div>

            <div style="margin-top:10px;">
                <div style="font-weight:700; font-size:0.9rem; margin-bottom:6px;">Método de pago</div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <div style="font-weight:700;">${orden.cuenta.bank || orden.cuenta.banco || '-'}</div>
                    <div style="font-family: 'Courier New', monospace; font-size:0.95rem;">${orden.cuenta.accountNumber || orden.cuenta.numero || '-'}</div>
                    <div style="font-size:0.88rem; color:#6B7280;">Referencia: ${orden.referencia}</div>
                    <div style="font-size:0.88rem; color:#374151;">Beneficiario: ${orden.cuenta.beneficiary || orden.cuenta.titular || '-'}</div>
                </div>
            </div>
        </div>
    `;
    
    contenedor.innerHTML = html;
    
    // Mostrar modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Funciones helper

function obtenerClienteDelStorage() {
    const data = localStorage.getItem('rifaplus_cliente');
    return data ? JSON.parse(data) : null;
}

function obtenerBoletosSelecionados() {
    if (typeof selectedNumbersGlobal !== 'undefined') {
        return Array.from(selectedNumbersGlobal);
    }
    const stored = localStorage.getItem('rifaplusSelectedNumbers');
    return stored ? JSON.parse(stored) : [];
}

function calcularTotales(cantidad, precioUnitario = 50) {
    let totalFinal = 0;
    let descuentoMonto = 0;
    let boletosRestantes = cantidad;

    if (boletosRestantes >= 20) {
        const paquetes20 = Math.floor(boletosRestantes / 20);
        totalFinal += paquetes20 * 800;
        descuentoMonto += paquetes20 * (20 * precioUnitario - 800);
        boletosRestantes -= paquetes20 * 20;
    }

    if (boletosRestantes >= 10) {
        totalFinal += 450;
        descuentoMonto += (10 * precioUnitario - 450);
        boletosRestantes -= 10;
    }

    totalFinal += boletosRestantes * precioUnitario;

    return {
        cantidadBoletos: cantidad,
        precioUnitario: precioUnitario,
        subtotal: cantidad * precioUnitario,
        descuentoMonto: descuentoMonto,
        descuentoPorcentaje: descuentoMonto > 0 ? ((descuentoMonto / (cantidad * precioUnitario)) * 100) : 0,
        totalFinal: totalFinal
    };
}

// Exportar para acceso global
window.iniciarFlujoPago = iniciarFlujoPago;
window.abrirModalSeleccionCuenta = abrirModalSeleccionCuenta;
window.cerrarModalSeleccionCuenta = cerrarModalSeleccionCuenta;
window.mostrarOrdenFormal = mostrarOrdenFormal;
