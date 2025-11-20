// carrito-global.js - Carrito disponible en todas las páginas

document.addEventListener('DOMContentLoaded', function() {
    inyectarCarritoSiNecesario();
    inicializarCarritoGlobal();
});

function inyectarCarritoSiNecesario() {
    // Si el modal carrito no existe, crearlo
    if (!document.getElementById('carritoModal')) {
        const carritoHtml = `
        <div class="modal-carrito-overlay" id="carritoModal">
            <div class="modal-carrito">
                <div class="modal-carrito-header">
                    <h2>🛒 Tu Carrito</h2>
                    <button class="modal-carrito-close modal-carrito-close-red" id="closeCarrito" aria-label="Cerrar carrito">×</button>
                </div>
                
                <div class="modal-carrito-body">
                    <div class="carrito-vacio" id="carritoVacio">
                        <div class="carrito-vacio-content">
                            <p class="carrito-vacio-icon">🎯</p>
                            <p class="carrito-vacio-titulo">Tu carrito está vacío</p>
                            <p class="carrito-vacio-sub">¡Comienza a seleccionar tus boletos favoritos!</p>
                            <button class="btn btn-primary btn-carrito-comprar" id="btnIrAComprar">
                                🎫 Ir a Comprar Boletos
                            </button>
                        </div>
                    </div>
                    <div class="carrito-lista" id="carritoLista" style="display: none;">
                        <div class="carrito-items" id="carritoItems"></div>
                    </div>
                </div>

                <div class="modal-carrito-footer" id="carritoFooter" style="display: none;">
                    <div class="carrito-resumen" id="carritoResumen" style="display: none;">
                        <div class="carrito-resumen-row">
                            <div class="carrito-resumen-item">
                                <span>Cantidad:</span>
                                <strong id="carritoResumenCantidad">0</strong>
                            </div>
                            <button class="carrito-item-trash-btn" id="btnLimpiarCarrito" title="Eliminar todos los boletos" aria-label="Limpiar carrito">
                                <i class="fas fa-trash carrito-item-trash" aria-hidden="true"></i>
                            </button>
                        </div>
                        <div class="carrito-resumen-item">
                            <span>Descuento:</span>
                            <strong id="carritoResumenDescuento">$0</strong>
                        </div>
                        <div class="carrito-resumen-total">
                            <span>Total:</span>
                            <strong id="carritoResumenTotal">$0</strong>
                        </div>
                    </div>
                    <div class="carrito-acciones carrito-acciones-bottom">
                        <button class="btn btn-outline" id="btnSeguirComprando">Seguir comprando</button>
                        <button class="btn btn-success btn-lg" id="btnProcederCarrito" disabled>Proceder al pago</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', carritoHtml);
    }
}

function inicializarCarritoGlobal() {
    const carritoNav = document.getElementById('carritoNav');
    const carritoModal = document.getElementById('carritoModal');
    
    if (!carritoNav || !carritoModal) return;

    // Abrir carrito al hacer click en el icono
    carritoNav.addEventListener('click', function(e) {
        e.stopPropagation();
        carritoModal.classList.add('active');
        actualizarVistaCarritoGlobal();
    });

    // Cerrar carrito
    const closeCarrito = document.getElementById('closeCarrito');
    if (closeCarrito) {
        closeCarrito.addEventListener('click', cerrarCarritoGlobal);
    }

    carritoModal.addEventListener('click', function(e) {
        if (e.target === carritoModal) {
            cerrarCarritoGlobal();
        }
    });

    // Botón "Seguir comprando"
    const btnSeguirComprando = document.getElementById('btnSeguirComprando');
    if (btnSeguirComprando) {
        btnSeguirComprando.addEventListener('click', cerrarCarritoGlobal);
    }

    // Botón "Proceder al pago" - ir a compra.html si no estamos allá
    const btnProcederCarrito = document.getElementById('btnProcederCarrito');
    if (btnProcederCarrito) {
        btnProcederCarrito.addEventListener('click', function() {
            const isOnCompraPage = window.location.pathname.includes('compra.html');
            if (isOnCompraPage) {
                // Si ya estamos en compra.html, cerrar carrito y ejecutar el click en btnComprar
                cerrarCarritoGlobal();
                const btnComprar = document.getElementById('btnComprar');
                if (btnComprar) {
                    btnComprar.click();
                }
            } else {
                // Si estamos en otra página, redirigir a compra.html
                window.location.href = 'compra.html';
            }
        });
    }

    // Botón "Ir a Comprar Boletos" en carrito vacío
    const btnIrAComprar = document.getElementById('btnIrAComprar');
    if (btnIrAComprar) {
        btnIrAComprar.addEventListener('click', function() {
            window.location.href = 'compra.html';
        });
    }

    // Botón "Limpiar Carrito" - elimina todos los boletos
    const btnLimpiarCarrito = document.getElementById('btnLimpiarCarrito');
    if (btnLimpiarCarrito) {
        btnLimpiarCarrito.addEventListener('click', function() {
            if (confirm('¿Estás seguro de que deseas eliminar todos los boletos del carrito?')) {
                localStorage.removeItem('rifaplusSelectedNumbers');
                // Limpiar el Set sin reasignarlo
                if (typeof selectedNumbersGlobal !== 'undefined') {
                    selectedNumbersGlobal.clear();
                }
                actualizarVistaCarritoGlobal();
                actualizarContadorCarrito();
                // Si estamos en compra.html, también actualizamos la vista allá
                if (window.actualizarResumenCompra) {
                    window.actualizarResumenCompra();
                }
            }
        });
    }

    // Tecla Escape para cerrar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && carritoModal && carritoModal.classList.contains('active')) {
            cerrarCarritoGlobal();
        }
    });
}

function cerrarCarritoGlobal() {
    const carritoModal = document.getElementById('carritoModal');
    if (carritoModal) {
        carritoModal.classList.remove('active');
    }
}

function actualizarVistaCarritoGlobal() {
    const selectedNumbers = obtenerBoletosSelecionados();
    const carritoItems = document.getElementById('carritoItems');
    const carritoVacio = document.getElementById('carritoVacio');
    const carritoLista = document.getElementById('carritoLista');
    const carritoResumen = document.getElementById('carritoResumen');
    const carritoResumenCantidad = document.getElementById('carritoResumenCantidad');
    const carritoResumenDescuento = document.getElementById('carritoResumenDescuento');
    const carritoResumenTotal = document.getElementById('carritoResumenTotal');
    const btnProcederCarrito = document.getElementById('btnProcederCarrito');
    const carritoFooter = document.getElementById('carritoFooter');

    if (!carritoItems || !carritoVacio || !carritoLista) return;

    carritoItems.innerHTML = '';

    if (selectedNumbers.length === 0) {
        carritoVacio.style.display = 'flex';
        carritoLista.style.display = 'none';
        if (carritoResumen) carritoResumen.style.display = 'none';
        if (carritoFooter) carritoFooter.style.display = 'none';
        if (btnProcederCarrito) btnProcederCarrito.disabled = true;
        
        // Actualizar texto del botón para ir a comprar
        if (btnProcederCarrito) {
            btnProcederCarrito.textContent = 'Ir a Comprar';
        }
        return;
    }

    carritoVacio.style.display = 'none';
    carritoLista.style.display = 'block';
    if (carritoResumen) carritoResumen.style.display = 'flex';
    if (carritoFooter) carritoFooter.style.display = 'flex';
    if (btnProcederCarrito) {
        btnProcederCarrito.disabled = false;
        btnProcederCarrito.textContent = 'Proceder al pago';
    }

    // Crear lista de boletos ordenados
    const numerosOrdenados = [...selectedNumbers].sort((a, b) => a - b);
    const precioUnitario = (window.rifaplusConfig && window.rifaplusConfig.ticketPrice) ? Number(window.rifaplusConfig.ticketPrice) : 50;

    numerosOrdenados.forEach(numero => {
        const itemHtml = `
            <div class="carrito-item" data-numero="${numero}">
                <div class="carrito-item-numero">
                    <span class="carrito-item-numero-text">Boleto #${numero}</span>
                    <span class="carrito-item-numero-precio">$${precioUnitario.toFixed(2)}</span>
                </div>
                <button class="carrito-item-trash-btn" data-numero="${numero}" aria-label="Eliminar boleto ${numero}" title="Eliminar boleto ${numero}">
                    <i class="fas fa-trash carrito-item-trash" aria-hidden="true"></i>
                </button>
            </div>
        `;
        carritoItems.insertAdjacentHTML('beforeend', itemHtml);
    });

    // Añadir event listeners solo al icono de basura por fila
    carritoItems.querySelectorAll('.carrito-item-trash-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const numero = parseInt(this.getAttribute('data-numero'), 10);
            removerBoletoSeleccionado(numero);
            actualizarVistaCarritoGlobal();
        });
    });

    // Actualizar resumen
    const calcTotal = calcularDescuentoGlobal(selectedNumbers.length, precioUnitario);
    if (carritoResumenCantidad) carritoResumenCantidad.textContent = calcTotal.cantidadBoletos;
    const subtotalEl = document.getElementById('carritoResumenSubtotal');
    if (subtotalEl) subtotalEl.textContent = `$${calcTotal.subtotal.toFixed(2)}`;
    if (carritoResumenDescuento) carritoResumenDescuento.textContent = `$${calcTotal.descuentoMonto.toFixed(2)}`;
    if (carritoResumenTotal) carritoResumenTotal.textContent = `$${calcTotal.totalFinal.toFixed(2)}`;
}

function obtenerBoletosSelecionados() {
    // Si estamos en compra.html, usar el Set global
    if (typeof selectedNumbersGlobal !== 'undefined') {
        return Array.from(selectedNumbersGlobal);
    }
    // En otras páginas, obtener del localStorage
    const stored = localStorage.getItem('rifaplusSelectedNumbers');
    return stored ? JSON.parse(stored) : [];
}

function removerBoletoSeleccionado(numero) {
    // Si estamos en compra.html, usar el Set global
    if (typeof selectedNumbersGlobal !== 'undefined') {
        selectedNumbersGlobal.delete(numero);
        // Actualizar la grilla si existe
        const botonNumero = document.querySelector(`.numero-btn[data-numero="${numero}"]`);
        if (botonNumero) {
            botonNumero.click();
        }
    }
    // Actualizar localStorage también
    let stored = localStorage.getItem('rifaplusSelectedNumbers');
    let numbers = stored ? JSON.parse(stored) : [];
    numbers = numbers.filter(n => n !== numero);
    localStorage.setItem('rifaplusSelectedNumbers', JSON.stringify(numbers));
}

function calcularDescuentoGlobal(cantidad, precioUnitario = 50) {
    let totalFinal = 0;
    let descuentoMonto = 0;
    
    let boletosRestantes = cantidad;
    
    // Aplicar paquete de 20 (si aplica)
    if (boletosRestantes >= 20) {
        const paquetes20 = Math.floor(boletosRestantes / 20);
        totalFinal += paquetes20 * 800;
        descuentoMonto += paquetes20 * (20 * precioUnitario - 800);
        boletosRestantes -= paquetes20 * 20;
    }
    
    // Aplicar paquete de 10 (si aplica)
    if (boletosRestantes >= 10) {
        totalFinal += 450;
        descuentoMonto += (10 * precioUnitario - 450);
        boletosRestantes -= 10;
    }
    
    // Agregar boletos sueltos restantes
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

// Función para sincronizar carrito al seleccionar en compra.html
function sincronizarCarritoAlLocalStorage() {
    if (typeof selectedNumbersGlobal !== 'undefined') {
        const numbers = Array.from(selectedNumbersGlobal);
        localStorage.setItem('rifaplusSelectedNumbers', JSON.stringify(numbers));
    }
}

// Actualizar contador del carrito globalmente
function actualizarContadorCarritoGlobal() {
    const carritoCount = document.querySelector('.carrito-count');
    if (carritoCount) {
        const selectedNumbers = obtenerBoletosSelecionados();
        carritoCount.textContent = selectedNumbers.length;
    }
}
