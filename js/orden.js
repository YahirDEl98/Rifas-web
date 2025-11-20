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
    // Estado y ciudad (agregados recientemente)
    const estadoEl = document.getElementById('clienteEstadoOrden');
    if (estadoEl) estadoEl.textContent = cliente.estado || '-';
    const ciudadEl = document.getElementById('clienteCiudadOrden');
    if (ciudadEl) ciudadEl.textContent = cliente.ciudad || '-';
    
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
    // Now handled by modal when opened. Keep function for compatibility.
    return;
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
    // Enable generation only if the user confirmed their data (checkbox)
    const checkbox = document.getElementById('confirmDatos');
    const generarBtn = document.getElementById('btnGenerarOrden');
    if (generarBtn) {
        generarBtn.disabled = !(checkbox && checkbox.checked);
    }

    // Update left summary with selected account
    const leftContainer = document.getElementById('cuentaResumenLeft');
    if (leftContainer) {
        document.getElementById('leftBanco').textContent = cuenta.bank || '-';
        document.getElementById('leftBeneficiario').textContent = cuenta.beneficiary || '-';
        document.getElementById('leftCuenta').textContent = cuenta.accountNumber || '-';
        leftContainer.style.display = 'block';
    }
}

function mostrarDetallesPago(cuenta) {
    // Store selected account and reference so it can be included in the order summary
    try {
        localStorage.setItem('rifaplus_selected_account', JSON.stringify(cuenta));
    } catch (e) {}
    const cliente = JSON.parse(localStorage.getItem('rifaplus_cliente') || '{}');
    const referencia = `${cliente.ordenId}`;
    localStorage.setItem('rifaplus_referencia', referencia);
    // UI updates are handled elsewhere (left summary). No right-panel assumed.
}

function configurarBotonesCopiar(numeroCuenta, referencia) {
    // Guardado: copiar buttons live only in modal/formal view; these elements may not exist here.
    const btnCopiarCuenta = document.getElementById('btnCopiarCuenta');
    const btnCopiarReferencia = document.getElementById('btnCopiarReferencia');
    if (btnCopiarCuenta) {
        btnCopiarCuenta.onclick = function(e) { e.preventDefault(); copiarAlPortapapeles(numeroCuenta, 'Número de cuenta copiado'); };
    }
    if (btnCopiarReferencia) {
        btnCopiarReferencia.onclick = function(e) { e.preventDefault(); copiarAlPortapapeles(referencia, 'Referencia copiada'); };
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
    
    if (btnGenerarOrden) {
        btnGenerarOrden.addEventListener('click', function() {
            if (cuentaSeleccionada) {
                abrirOrdenFormal(cuentaSeleccionada);
            } else {
                rifaplusUtils.showFeedback && rifaplusUtils.showFeedback('Selecciona una cuenta de pago primero', 'warning');
            }
        });
    }
    
    // Botón para abrir modal de selección de cuenta (desde la columna izquierda)
    const btnSeleccionarCuenta = document.getElementById('btnSeleccionarCuenta');
    if (btnSeleccionarCuenta) {
        btnSeleccionarCuenta.addEventListener('click', function() {
            abrirModalSeleccionCuenta();
        });
    }

    // Cancelar orden
    const btnCancelarOrden = document.getElementById('btnCancelarOrden');
    if (btnCancelarOrden) {
        btnCancelarOrden.addEventListener('click', function() {
            // Clear client/order data and go back to compra
            localStorage.removeItem('rifaplus_cliente');
            window.location.href = 'compra.html';
        });
    }

    // Checkbox que confirma datos
    const confirmDatos = document.getElementById('confirmDatos');
    if (confirmDatos) {
        confirmDatos.addEventListener('change', function() {
            const generarBtn = document.getElementById('btnGenerarOrden');
            if (generarBtn) {
                generarBtn.disabled = !(confirmDatos.checked && cuentaSeleccionada);
            }
        });
    }
    
    // Menu hamburger
    configurarMenuHamburger();
}

/* Modal de selección de cuenta (izquierda) */
function abrirModalSeleccionCuenta() {
    const modal = document.getElementById('modalSeleccionCuenta');
    if (!modal) return;
    console.log('[orden] abrirModalSeleccionCuenta called');
    modal.classList.add('show');
    // ensure visible if CSS missing — force overlay to top
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.zIndex = '10001';
    document.body.style.overflow = 'hidden';

    // ensure inner modal is on top of overlay and visible
    const inner = modal.querySelector('.modal-contacto');
    if (inner) {
        inner.style.position = 'relative';
        inner.style.zIndex = '10002';
        inner.style.background = 'white';
        inner.style.boxShadow = '0 30px 80px rgba(0,0,0,0.45)';
    }
    // Renderizar cuentas
    const cuentas = window.rifaplusConfig.bankAccounts || [];
    const lista = document.getElementById('cuentasLista');
    if (!lista) {
        console.warn('[orden] cuentasLista not found in DOM');
        return;
    }
    lista.innerHTML = '';
    cuentas.forEach((c, idx) => {
        const el = document.createElement('div');
        el.className = 'pago-card';
        el.style.cursor = 'pointer';
        el.style.padding = '0.6rem';
        el.style.borderBottom = '1px solid var(--border-color)';
        el.innerHTML = `<div style="font-weight:600">${c.bank}</div><div style="font-size:0.95rem">${c.beneficiary} · ${c.accountNumber}</div>`;
        el.addEventListener('click', function() {
            // Seleccionar y cerrar modal
            seleccionarCuenta(c, el);
            cerrarModalSeleccionCuenta();
        });
        lista.appendChild(el);
    });

    // Fallback: if modal isn't visible (computed style), create a dynamic simple modal
    try {
        const cs = window.getComputedStyle(modal);
        if (cs.display === 'none' || modal.getBoundingClientRect().height === 0) {
            console.warn('[orden] modalSeleccionCuenta not visible - using dynamic fallback');
            crearModalDinamicoSeleccionCuenta(cuentas);
        }
    } catch (e) {
        // ignore
    }
}

function crearModalDinamicoSeleccionCuenta(cuentas) {
    // Remove existing dynamic if present
    const existing = document.getElementById('modalSeleccionCuentaDynamic');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'modalSeleccionCuentaDynamic';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';

    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.borderRadius = '12px';
    box.style.width = 'min(520px, 92vw)';
    box.style.maxHeight = '80vh';
    box.style.overflowY = 'auto';
    box.style.padding = '0.75rem';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '0.5rem';

    const title = document.createElement('div');
    title.style.fontWeight = '700';
    title.textContent = 'Selecciona la cuenta de pago';
    header.appendChild(title);

    const btnX = document.createElement('button');
    btnX.setAttribute('aria-label', 'Cerrar');
    btnX.textContent = '×';
    btnX.style.fontSize = '20px';
    btnX.style.background = 'transparent';
    btnX.style.border = 'none';
    btnX.style.cursor = 'pointer';
    btnX.addEventListener('click', function() {
        overlay.remove();
        document.body.style.overflow = 'auto';
    });
    header.appendChild(btnX);

    box.appendChild(header);

    if (!cuentas || cuentas.length === 0) {
        const p = document.createElement('div');
        p.textContent = 'No hay cuentas registradas.';
        box.appendChild(p);
    } else {
        cuentas.forEach(c => {
            const row = document.createElement('div');
            row.style.padding = '0.6rem';
            row.style.borderBottom = '1px solid #eee';
            row.style.cursor = 'pointer';
            row.innerHTML = `<div style="font-weight:600">${c.bank}</div><div style="font-size:0.95rem">${c.beneficiary} · ${c.accountNumber}</div>`;
            row.addEventListener('click', function() {
                seleccionarCuenta(c, row);
                overlay.remove();
                document.body.style.overflow = 'auto';
            });
            box.appendChild(row);
        });
    }

    // No footer close button by design — modal must be closed via the X or by selecting an account

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
}

function cerrarModalSeleccionCuenta() {
    const modal = document.getElementById('modalSeleccionCuenta');
    if (!modal) return;
    modal.classList.remove('show');
    // also hide if CSS not applied
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Configurar botones del modal de selección (attach inmediatamente)
(function setupModalSeleccionHandlers() {
    const closeSel = document.getElementById('closeModalSeleccionCuenta');
    const cancelSel = document.getElementById('btnCancelarSeleccionCuenta');
    const overlaySel = document.getElementById('modalSeleccionCuenta');
    if (closeSel) closeSel.addEventListener('click', cerrarModalSeleccionCuenta);
    if (cancelSel) cancelSel.addEventListener('click', cerrarModalSeleccionCuenta);
    if (overlaySel) overlaySel.addEventListener('click', function(e) {
        if (e.target === overlaySel) cerrarModalSeleccionCuenta();
    });
})();

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
            whatsapp: cliente.whatsapp,
            estado: cliente.estado,
            ciudad: cliente.ciudad
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
