// orden.js - Gestión de la página de orden con métodos de pago

let cuentaSeleccionada = null;

document.addEventListener('DOMContentLoaded', function() {
    cargarOrden();
    inicializarMetodosPago();
    configurarEventListenersOrden();
});

function cargarOrden() {
    // Obtener datos del cliente
    const cliente = JSON.parse(localStorage.getItem('rifaplus_cliente') || '{}');
    
    if (!cliente.ordenId) {
        // Si no hay orden, redirigir a compra
        window.location.href = 'compra.html';
        return;
    }
    
    // Llenar datos del cliente
    document.getElementById('ordenNumero').textContent = cliente.ordenId;
    document.getElementById('clienteNombreOrden').textContent = cliente.nombre || '-';
    document.getElementById('clienteApellidosOrden').textContent = cliente.apellidos || '-';
    document.getElementById('clienteWhatsappOrden').textContent = cliente.whatsapp || '-';
    
    // Calcular fecha en formato legible
    if (cliente.fecha) {
        const fecha = new Date(cliente.fecha);
        const opciones = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const fechaFormato = fecha.toLocaleDateString('es-ES', opciones);
        document.getElementById('ordenFecha').textContent = `Generada: ${fechaFormato}`;
    }
    
    // Cargar boletos
    const boletos = JSON.parse(localStorage.getItem('rifaplus_boletos') || '[]');
    cargarBoletos(boletos);
}

function cargarBoletos(boletos) {
    const boletosLista = document.getElementById('boletos-lista');
    boletosLista.innerHTML = '';
    
    if (boletos.length === 0) {
        boletosLista.innerHTML = '<p style="grid-column: 1/-1; color: var(--text-light);">No hay boletos seleccionados</p>';
        return;
    }
    
    // Mostrar boletos seleccionados
    boletos.forEach(numero => {
        const chip = document.createElement('div');
        chip.className = 'boleto-chip';
        chip.innerHTML = `<i class="fas fa-ticket-alt"></i> ${numero}`;
        boletosLista.appendChild(chip);
    });
    
    // Calcular totales usando función centralizada
    const cantidad = boletos.length;
    const precioUnitario = window.rifaplusConfig.ticketPrice || 50;
    
    // Usar función centralizada para calcular descuentos
    const calculoDescuento = window.rifaplusUtils.calcularDescuento(cantidad, precioUnitario);
    
    // Mostrar resumen
    document.getElementById('cantidadBoletosOrden').textContent = cantidad;
    document.getElementById('descuentoOrden').textContent = calculoDescuento.descuentoMonto > 0 ? `-$${calculoDescuento.descuentoMonto.toFixed(2)}` : '$0';
    document.getElementById('totalOrden').textContent = `$${calculoDescuento.totalFinal.toFixed(2)}`;
    
    // Guardar en storage para usarlo después
    // Normalizamos a `subtotal` (campo esperado por el backend). Mantener `total` por compatibilidad.
    localStorage.setItem('rifaplus_total', JSON.stringify({
        cantidad: calculoDescuento.cantidadBoletos,
        precioUnitario: calculoDescuento.precioUnitario,
        subtotal: calculoDescuento.subtotal,
        // alias histórico (mantener para código antiguo)
        total: calculoDescuento.subtotal,
        descuento: calculoDescuento.descuentoMonto,
        totalFinal: calculoDescuento.totalFinal
    }));
}

function inicializarMetodosPago() {
    const pagosGrid = document.getElementById('pagosGrid');
    const cuentas = window.rifaplusConfig.bankAccounts || [];
    
    pagosGrid.innerHTML = '';
    
    cuentas.forEach(cuenta => {
        const card = document.createElement('div');
        card.className = 'pago-card';
        card.innerHTML = `
            <div class="pago-bank-name">${cuenta.bank}</div>
            <div class="pago-beneficiary">${cuenta.beneficiary}</div>
        `;
        
        card.addEventListener('click', function() {
            seleccionarCuenta(cuenta, card);
        });
        
        pagosGrid.appendChild(card);
    });
}

function seleccionarCuenta(cuenta, elemento) {
    // Remover selección anterior
    document.querySelectorAll('.pago-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Marcar como seleccionada
    elemento.classList.add('selected');
    cuentaSeleccionada = cuenta;
    
    // Mostrar detalles de pago
    mostrarDetallesPago(cuenta);
    
    // Habilitar botón generar orden
    document.getElementById('btnGenerarOrden').disabled = false;
}

function mostrarDetallesPago(cuenta) {
    const pagoSeleccionado = document.getElementById('pagoSeleccionado');
    
    // Obtener datos de la orden
    const totales = JSON.parse(localStorage.getItem('rifaplus_total') || '{}');
    const cliente = JSON.parse(localStorage.getItem('rifaplus_cliente') || '{}');
    const totalFinal = totales.totalFinal || 0;
    
    // Llenar detalles
    document.getElementById('detalleBanco').textContent = cuenta.bank;
    document.getElementById('detalleBeneficiario').textContent = cuenta.beneficiary;
    document.getElementById('detalletipo').textContent = cuenta.accountType;
    document.getElementById('detalleCuenta').textContent = cuenta.accountNumber;
    document.getElementById('detalleTelefono').textContent = cuenta.phone;
    
    // Referencia = sólo el número de orden (ej: RIFA-00001)
    // Dejamos el monto en el documento pero la referencia principal es el ID
    const referencia = `${cliente.ordenId}`;
    document.getElementById('detalleReferencia').textContent = referencia;
    
    // Guardar referencia en storage (solo el ID de orden)
    localStorage.setItem('rifaplus_referencia', referencia);
    
    // Mostrar sección de pago seleccionado
    pagoSeleccionado.style.display = 'block';
    
    // Configurar botones de copiar
    configurarBotonesCopiar(cuenta.accountNumber, referencia);
}

function configurarBotonesCopiar(numeroCuenta, referencia) {
    const btnCopiarCuenta = document.getElementById('btnCopiarCuenta');
    const btnCopiarReferencia = document.getElementById('btnCopiarReferencia');
    
    if (btnCopiarCuenta) {
        btnCopiarCuenta.onclick = function(e) {
            e.preventDefault();
            copiarAlPortapapeles(numeroCuenta, 'Número de cuenta copiado');
        };
    }
    
    if (btnCopiarReferencia) {
        btnCopiarReferencia.onclick = function(e) {
            e.preventDefault();
            copiarAlPortapapeles(referencia, 'Referencia copiada');
        };
    }
}

function copiarAlPortapapeles(texto, mensaje) {
    navigator.clipboard.writeText(texto).then(() => {
        if (window.rifaplusUtils && window.rifaplusUtils.showFeedback) {
            rifaplusUtils.showFeedback(`✅ ${mensaje}`, 'success');
        } else {
            alert(mensaje);
        }
    }).catch(() => {
        alert('Error al copiar');
    });
}

function configurarEventListenersOrden() {
    const btnGenerarOrden = document.getElementById('btnGenerarOrden');
    const btnEditarCliente = document.getElementById('btnEditarCliente');
    
    if (btnGenerarOrden) {
        btnGenerarOrden.addEventListener('click', function() {
            if (cuentaSeleccionada) {
                abrirOrdenFormal(cuentaSeleccionada);
            }
        });
    }
    
    if (btnEditarCliente) {
        btnEditarCliente.addEventListener('click', function() {
            // Volver a compra para editar datos
            window.location.href = 'compra.html';
        });
    }
    
    // Menu hamburger
    configurarMenuHamburger();
}

function confirmarPago() {
    const cliente = JSON.parse(localStorage.getItem('rifaplus_cliente') || '{}');
    const totales = JSON.parse(localStorage.getItem('rifaplus_total') || '{}');
    const referencia = localStorage.getItem('rifaplus_referencia');
    
    // Crear resumen de pago confirmado
    const pagoConfirmado = {
        ordenId: cliente.ordenId,
        cliente: {
            nombre: cliente.nombre,
            apellidos: cliente.apellidos,
            whatsapp: cliente.whatsapp
        },
        cuenta: {
            bank: cuentaSeleccionada.bank,
            beneficiary: cuentaSeleccionada.beneficiary,
            accountNumber: cuentaSeleccionada.accountNumber,
            accountType: cuentaSeleccionada.accountType
        },
        pago: {
            cantidad: totales.cantidad,
            total: totales.totalFinal,
            referencia: referencia,
            estado: 'pendiente'
        },
        fechaConfirmacion: new Date().toISOString()
    };
    
    // Guardar confirmación de pago
    localStorage.setItem('rifaplus_pago_confirmado', JSON.stringify(pagoConfirmado));
    
    // Mostrar feedback de éxito
    if (window.rifaplusUtils && window.rifaplusUtils.showFeedback) {
        rifaplusUtils.showFeedback('✅ Pago confirmado. Procesando...', 'success');
    }
    
    // Redirigir a página de confirmación (podría ser la misma u otra)
    setTimeout(() => {
        // Por ahora volvemos a inicio, pero aquí irían a una página de "pedido enviado" o similar
        window.location.href = 'index.html';
    }, 2000);
}

function configurarMenuHamburger() {
    const hamburger = document.getElementById('hamburger');
    const overlayMenu = document.getElementById('overlayMenu');
    const overlayClose = document.getElementById('overlayClose');
    
    if (hamburger && overlayMenu) {
        hamburger.addEventListener('click', function() {
            overlayMenu.classList.add('show');
            hamburger.setAttribute('aria-expanded', 'true');
        });
    }
    
    if (overlayClose) {
        overlayClose.addEventListener('click', function() {
            overlayMenu.classList.remove('show');
            hamburger.setAttribute('aria-expanded', 'false');
        });
    }
    
    if (overlayMenu) {
        overlayMenu.addEventListener('click', function(e) {
            if (e.target === overlayMenu) {
                overlayMenu.classList.remove('show');
                hamburger.setAttribute('aria-expanded', 'false');
            }
        });
    }
}
