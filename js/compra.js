// compra.js - VERSIÓN COMPLETA CON MÁQUINA DE LA SUERTE MEJORADA

// Almacenar selecciones globales (persiste al cambiar rangos)
const selectedNumbersGlobal = new Set();

document.addEventListener('DOMContentLoaded', function() {
    initSistemaCompra();
    // Carrito será inicializado por carrito-global.js
});

function initSistemaCompra() {
    
    const grid = document.getElementById('numerosGrid');
    if (!grid) {
        console.error('❌ ERROR CRÍTICO: No se encontró el elemento numerosGrid');
        return;
    }
    inicializarRangoDefault();
    configurarEventListeners();
    inicializarMaquinaSuerteMejorada();
    // Cargar datos reales de boletos vendidos/apartados
    fetchBoletosPublic();
    // Actualizar cada 10 segundos para reflejar cambios en la base de datos
    setInterval(fetchBoletosPublic, 10000);
}

// Fetch de boletos vendidos/apartados desde backend público
async function fetchBoletosPublic() {
    try {
        let endpoint = (window.rifaplusConfig && window.rifaplusConfig.apiEndpoint) ? window.rifaplusConfig.apiEndpoint : 'http://localhost:3000';
        // Normalize endpoint to avoid duplicate segments like `/api/api/...`
        endpoint = String(endpoint).replace(/\/+$/,''); // remove trailing slash(es)
        if (endpoint.endsWith('/api')) {
            endpoint = endpoint.replace(/\/api$/, '');
        }
        const res = await fetch(`${endpoint}/api/public/boletos`);
        if (!res.ok) return;
        const json = await res.json();
        if (json && json.success && json.data) {
            window.rifaplusSoldNumbers = Array.isArray(json.data.sold) ? json.data.sold.map(Number) : [];
            window.rifaplusReservedNumbers = Array.isArray(json.data.reserved) ? json.data.reserved.map(Number) : [];
            // Re-render current range so the UI reflects updated sold/reserved numbers
            const activeBtn = document.querySelector('.rango-btn.active');
            if (activeBtn) {
                const inicio = parseInt(activeBtn.getAttribute('data-inicio'), 10);
                const fin = parseInt(activeBtn.getAttribute('data-fin'), 10);
                renderRange(inicio, fin);
            } else {
                // If no active button, re-render default range
                renderRange(1, Math.min(100, (window.rifaplusConfig && window.rifaplusConfig.totalTickets) ? window.rifaplusConfig.totalTickets : 500));
            }
        }
    } catch (e) {
        // Ignore network errors silently — UX will fallback
        console.warn('fetchBoletosPublic error', e);
    }
}

function inicializarMaquinaSuerteMejorada() {
    
    const btnGenerar = document.getElementById('btnGenerarNumeros');
    const btnDisminuir = document.getElementById('disminuirCantidad');
    const btnAumentar = document.getElementById('aumentarCantidad');
    const inputCantidad = document.getElementById('cantidadNumeros');
    const btnRepetir = document.getElementById('btnRepetir');
    const btnAgregarSuerte = document.getElementById('btnAgregarSuerte');
    
    // Helper: activar/desactivar botón generar según cantidad
    function actualizarEstadoBotonGenerar() {
        if (!btnGenerar || !inputCantidad) return;
        let val = parseInt(inputCantidad.value, 10);
        if (isNaN(val) || val < 1) {
            btnGenerar.disabled = true;
        } else {
            btnGenerar.disabled = false;
        }
    }

    // Configurar controles de cantidad
    if (btnDisminuir && btnAumentar && inputCantidad) {
        btnDisminuir.addEventListener('click', function() {
            let cantidad = parseInt(inputCantidad.value, 10);
            if (isNaN(cantidad)) cantidad = 0;
            if (cantidad > 0) {
                inputCantidad.value = cantidad - 1;
                actualizarTotalMaquina();
                actualizarEstadoBotonGenerar();
            }
        });
        
        btnAumentar.addEventListener('click', function() {
            let cantidad = parseInt(inputCantidad.value, 10);
            if (isNaN(cantidad)) cantidad = 0;
            const maxTickets = (window.rifaplusConfig && window.rifaplusConfig.totalTickets) ? window.rifaplusConfig.totalTickets : 500;
            if (cantidad < maxTickets) {
                inputCantidad.value = cantidad + 1;
                actualizarTotalMaquina();
                actualizarEstadoBotonGenerar();
            }
        });
        
        inputCantidad.addEventListener('change', function() {
            let cantidad = parseInt(this.value, 10);
            if (isNaN(cantidad) || cantidad < 0) cantidad = 0;
            const maxTickets = (window.rifaplusConfig && window.rifaplusConfig.totalTickets) ? window.rifaplusConfig.totalTickets : 500;
            if (cantidad > maxTickets) cantidad = maxTickets;
            this.value = cantidad;
            actualizarTotalMaquina();
            actualizarEstadoBotonGenerar();
        });

        // Input sanitization: allow only integers, clamp range, update total and button state live
        inputCantidad.addEventListener('input', function() {
            let raw = this.value;
            // Convert to integer, stripping non-digit characters
            let parsed = parseInt(raw, 10);
            if (isNaN(parsed) || parsed < 0) parsed = 0;
            const maxTickets = (window.rifaplusConfig && window.rifaplusConfig.totalTickets) ? window.rifaplusConfig.totalTickets : 500;
            if (parsed > maxTickets) parsed = maxTickets;
            if (String(parsed) !== raw) {
                // Update only if different to avoid cursor jump in some browsers
                this.value = parsed;
            }
            actualizarTotalMaquina();
            actualizarEstadoBotonGenerar();
        });
    }
    
    // Configurar botón generar
    if (btnGenerar) {
        btnGenerar.addEventListener('click', generarNumerosAleatoriosMejorado);
    }
    
    // Configurar botón repetir
    if (btnRepetir) {
        btnRepetir.addEventListener('click', generarNumerosAleatoriosMejorado);
    }
    
    // Configurar botón agregar suerte
    if (btnAgregarSuerte) {
        btnAgregarSuerte.addEventListener('click', agregarNumerosSuerteAlCarrito);
    }
    
    // Inicializar total y estado del botón
    actualizarTotalMaquina();
    actualizarEstadoBotonGenerar();
}

function actualizarTotalMaquina() {
    const inputCantidad = document.getElementById('cantidadNumeros');
    const totalDisplay = document.getElementById('totalMaquina');
    
    if (!inputCantidad || !totalDisplay) return;
    
    let cantidad = parseInt(inputCantidad.value, 10);
    if (isNaN(cantidad) || cantidad < 0) cantidad = 0;
    const precioUnitario = (window.rifaplusConfig && window.rifaplusConfig.ticketPrice) ? Number(window.rifaplusConfig.ticketPrice) : 50;
    const total = cantidad * precioUnitario;
    
    totalDisplay.textContent = `$${total.toFixed(2)}`;
}

function generarNumerosAleatoriosMejorado() {
    
    const inputCantidad = document.getElementById('cantidadNumeros');
    const numerosSuerte = document.getElementById('numerosSuerte');
    const resultado = document.getElementById('maquinaResultado');
    
    if (!inputCantidad || !numerosSuerte) {
        console.error('❌ Elementos de máquina de la suerte no encontrados');
        return;
    }
    
    const cantidad = parseInt(inputCantidad.value, 10);
    if (isNaN(cantidad) || cantidad < 1) {
        rifaplusUtils.showFeedback('⚠️ Selecciona al menos 1 número para generar.', 'warning');
        return [];
    }
    const numerosGenerados = [];
    
    // Limpiar resultados anteriores
    numerosSuerte.innerHTML = '';
    
    // Generar números únicos que estén disponibles
    const numerosDisponibles = obtenerNumerosDisponibles();
    
    if (numerosDisponibles.length < cantidad) {
        rifaplusUtils.showFeedback(`⚠️ Solo hay ${numerosDisponibles.length} números disponibles. No hay suficientes para generar ${cantidad} números.`, 'warning');
        return;
    }
    
    // Seleccionar números aleatorios de los disponibles
    for (let i = 0; i < cantidad; i++) {
        if (numerosDisponibles.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * numerosDisponibles.length);
        const numero = numerosDisponibles.splice(randomIndex, 1)[0];
        numerosGenerados.push(numero);
        
        // Crear elemento visual del número
        const numeroChip = document.createElement('div');
        numeroChip.className = 'numero-chip';
        numeroChip.textContent = numero;
        numeroChip.setAttribute('data-numero', numero);
        
        numerosSuerte.appendChild(numeroChip);
    }
    
    // Guardar números generados para usarlos después
    numerosSuerte.setAttribute('data-numeros', numerosGenerados.join(','));
    
    // Mostrar resultado
    if (resultado) {
        resultado.style.display = 'block';
    }
    
    // Números generados
    
    // Efecto visual de aparición
    const chips = numerosSuerte.querySelectorAll('.numero-chip');
    chips.forEach((chip, index) => {
        chip.style.opacity = '0';
        chip.style.transform = 'scale(0.5)';
        
        setTimeout(() => {
            chip.style.transition = 'all var(--transition-fast)';
            chip.style.opacity = '1';
            chip.style.transform = 'scale(1)';
        }, index * 100);
    });
    
    rifaplusUtils.showFeedback(`🎲 ${numerosGenerados.length} números generados correctamente`, 'success');
    
    return numerosGenerados;
}

function obtenerNumerosDisponibles() {
    // Obtener total de boletos de la configuración global (por defecto 500)
    const totalTickets = (window.rifaplusConfig && window.rifaplusConfig.totalTickets) ? window.rifaplusConfig.totalTickets : 500;
    
    // Crear un conjunto de todos los números posibles
    const todosLosNumeros = new Set();
    for (let i = 1; i <= totalTickets; i++) {
        todosLosNumeros.add(i);
    }
    
    // Eliminar números que están vendidos/apartados según datos reales del servidor
    try {
        const sold = (window.rifaplusSoldNumbers && Array.isArray(window.rifaplusSoldNumbers)) ? window.rifaplusSoldNumbers : [];
        const reserved = (window.rifaplusReservedNumbers && Array.isArray(window.rifaplusReservedNumbers)) ? window.rifaplusReservedNumbers : [];
        sold.forEach(n => todosLosNumeros.delete(Number(n)));
        reserved.forEach(n => todosLosNumeros.delete(Number(n)));
    } catch (e) {
        // Si falla, no romper la UX — dejar lógica por defecto
        for (let i = 1; i <= totalTickets; i++) {
            if (i % 10 === 0 || i % 7 === 0) {
                todosLosNumeros.delete(i);
            }
        }
    }
    
    // Eliminar números ya seleccionados
    selectedNumbersGlobal.forEach(num => todosLosNumeros.delete(num));
    
    // Convertir Set a Array y retornar
    return Array.from(todosLosNumeros);
}

function agregarNumerosSuerteAlCarrito() {
    const numerosSuerte = document.getElementById('numerosSuerte');
    const numerosStr = numerosSuerte.getAttribute('data-numeros');
    
    if (!numerosStr) {
        rifaplusUtils.showFeedback('⚠️ Primero genera algunos números con la máquina de la suerte', 'warning');
        return;
    }
    
    const numeros = numerosStr.split(',').map(num => parseInt(num.trim()));
    let agregados = 0;
    
    numeros.forEach(numero => {
        // Verificar si el número es válido y no está ya seleccionado
        const totalTickets = (window.rifaplusConfig && window.rifaplusConfig.totalTickets) ? window.rifaplusConfig.totalTickets : 500;
        if (!isNaN(numero) && numero >= 1 && numero <= totalTickets && !selectedNumbersGlobal.has(numero)) {
            // No agregar si es vendido (múltiplo de 10) o apartado (múltiplo de 7)
            if (numero % 10 !== 0 && numero % 7 !== 0) {
                selectedNumbersGlobal.add(numero);
                agregados++;
                
                // Si el botón existe en el rango actual, aplicar animación
                const botonNumero = document.querySelector(`.numero-btn[data-numero="${numero}"]`);
                if (botonNumero) {
                    botonNumero.classList.add('selected');
                    botonNumero.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        botonNumero.style.transform = 'scale(1.05)';
                    }, 300);
                }
            }
        }
    });
    
    actualizarContadorCarrito();
    actualizarResumenCompra();
    
    if (agregados > 0) {
        rifaplusUtils.showFeedback(`🎉 ¡Listo! Se agregaron ${agregados} número(s) a tu selección`, 'success');
        
        const resultado = document.getElementById('maquinaResultado');
        if (resultado) {
            resultado.style.display = 'none';
        }
    } else {
        rifaplusUtils.showFeedback('⚠️ No se pudieron agregar los números. Puede que ya estén seleccionados o no estén disponibles.', 'warning');
    }
}

function configurarEventListeners() {
    
    const grid = document.getElementById('numerosGrid');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const btnComprar = document.getElementById('btnComprar');
    const btnProbarMaquina = document.getElementById('btnProbarMaquina');
    
    // 1. CLICKS EN NÚMEROS
    if (grid) {
        grid.addEventListener('click', function(e) {
            if (e.target.classList.contains('numero-btn')) {
                manejarClickNumero(e.target);
            }
        });
    }
    
    // 2. BOTONES DE RANGO - Se configuran dinámicamente en generarBotonesRango()
    
    // 3. BOTÓN LIMPIAR
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarSeleccion);
    }
    
    // 4. BOTÓN COMPRAR
    if (btnComprar) {
        btnComprar.addEventListener('click', function() {
            const seleccionados = selectedNumbersGlobal.size;
            if (seleccionados > 0) {
                abrirModalContacto();
            } else {
                rifaplusUtils.showFeedback('⚠️ Primero selecciona al menos un boleto', 'warning');
            }
        });
    }
    
    // 5. BOTÓN PROBAR MÁQUINA - Scroll suave con offset para mostrar el título
    if (btnProbarMaquina) {
        btnProbarMaquina.addEventListener('click', function(e) {
            e.preventDefault();
            const maquinaCard = document.getElementById('maquinaCard');
            if (maquinaCard) {
                const yOffset = -80; // Ajusta el offset según la altura del header
                const y = maquinaCard.getBoundingClientRect().top + window.pageYOffset + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        });
    }

    // Scroll con offset para "Seleccionar Boletos"
    const btnSeleccionarBoletos = document.querySelector('.compra-hero-cta .btn[href="#numerosGrid"]');
    if (btnSeleccionarBoletos) {
        btnSeleccionarBoletos.addEventListener('click', function(e) {
            e.preventDefault();
            // Buscar el título de la sección
            const tituloBoletos = document.querySelector('.seleccion-section .section-title');
            if (tituloBoletos) {
                const yOffset = -40; // Ajusta el offset para que el título quede visible
                const y = tituloBoletos.getBoundingClientRect().top + window.pageYOffset + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
            } else {
                // Fallback al grid si no se encuentra el título
                const numerosGrid = document.getElementById('numerosGrid');
                if (numerosGrid) {
                    const yOffset = -80;
                    const y = numerosGrid.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }
        });
    }

    // 6. BÚSQUEDA DE BOLETOS
    configurarBuscadorBoletos();
}

function manejarClickNumero(boton) {
    if (boton.classList.contains('sold') || boton.classList.contains('reserved')) {
        if (boton.classList.contains('sold')) {
            boton.style.transform = 'scale(1.05)';
            setTimeout(() => boton.style.transform = 'scale(1)', 300);
        }
        return;
    }
    
    boton.classList.toggle('selected');
    const numero = parseInt(boton.getAttribute('data-numero'), 10);
    
    // Mantener sincronización con Set global
    if (boton.classList.contains('selected')) {
        selectedNumbersGlobal.add(numero);
        rifaplusUtils.showFeedback(`✅ Número ${numero} seleccionado`, 'success');
    } else {
        selectedNumbersGlobal.delete(numero);
        rifaplusUtils.showFeedback(`❌ Número ${numero} removido`, 'warning');
    }
    
    const accion = boton.classList.contains('selected') ? 'SELECCIONADO' : 'DESELECCIONADO';
    
    if (boton.classList.contains('selected')) {
        boton.style.transform = 'scale(1.1)';
        setTimeout(() => {
            boton.style.transform = 'scale(1.05)';
        }, 150);
    } else {
        boton.style.transform = 'scale(1)';
    }
    
    actualizarContadorCarrito();
    actualizarResumenCompra();
    sincronizarCarritoAlLocalStorage();
}

function limpiarSeleccion() {
    if (selectedNumbersGlobal.size === 0) {
        rifaplusUtils.showFeedback('No tienes números seleccionados', 'warning');
        return;
    }
    
    if (confirm(`¿Estás seguro de que quieres limpiar la selección de ${selectedNumbersGlobal.size} número(s)?`)) {
        // Limpiar clases visuales en botones visibles
        const seleccionados = document.querySelectorAll('.numero-btn.selected');
        seleccionados.forEach(boton => {
            boton.classList.remove('selected');
            boton.style.transform = 'scale(1)';
        });
        
        // Limpiar Set global
        selectedNumbersGlobal.clear();
        
        actualizarContadorCarrito();
        actualizarResumenCompra();
        
        rifaplusUtils.showFeedback('Selección limpiada correctamente', 'success');
    }
}

function actualizarContadorCarrito() {
    const carritoCount = document.querySelector('.carrito-count');
    if (carritoCount) {
        // Usar Set global en lugar de contar botones visibles (que pueden cambiar al cambiar rango)
        const cantidad = selectedNumbersGlobal.size;
        carritoCount.textContent = cantidad;
    }
    
    // Actualizar vista del carrito si está abierto
    const carritoModal = document.getElementById('carritoModal');
    if (carritoModal && carritoModal.classList.contains('active')) {
        actualizarVistaCarrito();
    }
}

function actualizarResumenCompra() {
    const cantidadBoletos = document.getElementById('cantidadBoletos');
    const numerosSeleccionados = document.getElementById('numerosSeleccionados');
    const descuentoAplicado = document.getElementById('descuentoAplicado');
    const totalPagar = document.getElementById('totalPagar');
    const btnComprar = document.getElementById('btnComprar');
    
    if (!cantidadBoletos) return;
    
    // Usar Set global en lugar de contar botones visibles
    const cantidad = selectedNumbersGlobal.size;
    
    cantidadBoletos.textContent = cantidad;
    
    if (numerosSeleccionados) {
        if (cantidad > 0) {
            // Ordenar números seleccionados para visualización
            const numerosOrdenados = Array.from(selectedNumbersGlobal).sort((a, b) => a - b);
            numerosSeleccionados.innerHTML = `
                <div class="lista-numeros">
                    ${numerosOrdenados.map(num => `<span class="numero-chip">${num}</span>`).join('')}
                </div>
            `;
        } else {
            numerosSeleccionados.innerHTML = '<p class="sin-seleccion">Aún no has seleccionado ningún boleto</p>';
        }
    }
    
    const precioUnitario = window.rifaplusConfig.ticketPrice || 50;
    
    // Usar función centralizada para calcular descuentos
    const calculoDescuento = window.rifaplusUtils.calcularDescuento(cantidad, precioUnitario);
    
    const total = calculoDescuento.totalFinal;
    const descuento = calculoDescuento.descuentoMonto;
    
    if (descuentoAplicado) {
        descuentoAplicado.textContent = `$${descuento.toFixed(2)}`;
    }
    
    if (totalPagar) {
        totalPagar.textContent = `$${total.toFixed(2)}`;
    }
    
    if (btnComprar) {
        btnComprar.disabled = cantidad === 0;
    }
    
    // Resumen actualizado
}

function generarBotonesRango() {
    const totalTickets = (window.rifaplusConfig && window.rifaplusConfig.totalTickets) ? window.rifaplusConfig.totalTickets : 500;
    const rangoBoxes = document.getElementById('rangoBoxes');
    
    if (!rangoBoxes) {
        console.error('❌ ERROR: No se encontró elemento rangoBoxes');
        return;
    }
    
    // Limpiar botones previos
    rangoBoxes.innerHTML = '';
    
    const rangoTamaño = 100; // Rango de 100 números por botón
    let esActivo = true; // El primer botón será activo
    
    for (let inicio = 1; inicio <= totalTickets; inicio += rangoTamaño) {
        let fin = Math.min(inicio + rangoTamaño - 1, totalTickets);
        
        const btn = document.createElement('button');
        btn.className = 'rango-btn';
        if (esActivo) {
            btn.classList.add('active');
            esActivo = false;
        }
        btn.setAttribute('data-inicio', inicio);
        btn.setAttribute('data-fin', fin);
        btn.textContent = `${inicio}-${fin}`;
        
        btn.addEventListener('click', function() {
            manejarCambioRango(this);
        });
        
        rangoBoxes.appendChild(btn);
    }
    
    // Botones de rango generados
}

function inicializarRangoDefault() {
    // Inicializando rango por defecto
    
    // Generar botones de rango dinámicamente basándose en totalTickets
    generarBotonesRango();
    
    const rangoBtns = document.querySelectorAll('.rango-btn');
    const grid = document.getElementById('numerosGrid');
    
    let inicio = 1;
    let fin = 100;
    
    if (rangoBtns.length > 0) {
        rangoBtns.forEach(btn => btn.classList.remove('active'));
        rangoBtns[0].classList.add('active');
        inicio = parseInt(rangoBtns[0].getAttribute('data-inicio'), 10) || 1;
        fin = parseInt(rangoBtns[0].getAttribute('data-fin'), 10) || 100;
    }

    renderRange(inicio, fin);
}

function renderRange(inicio, fin) {
    const grid = document.getElementById('numerosGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Asegurar que inicio <= fin y que ambos sean enteros
    inicio = parseInt(inicio, 10) || 1;
    fin = parseInt(fin, 10) || inicio + 99;
    if (inicio > fin) {
        const t = inicio; inicio = fin; fin = t;
    }

    for (let i = inicio; i <= fin; i++) {
        const btn = document.createElement('button');
        btn.className = 'numero-btn';
        btn.textContent = i;
        btn.setAttribute('data-numero', i);

        // Marcar según datos reales obtenidos del servidor
        const soldSet = new Set((window.rifaplusSoldNumbers && Array.isArray(window.rifaplusSoldNumbers)) ? window.rifaplusSoldNumbers : []);
        const reservedSet = new Set((window.rifaplusReservedNumbers && Array.isArray(window.rifaplusReservedNumbers)) ? window.rifaplusReservedNumbers : []);

        if (soldSet.has(i)) {
            btn.classList.add('sold');
            btn.disabled = true;
            btn.title = 'Vendido';
        } else if (reservedSet.has(i)) {
            btn.classList.add('reserved');
            btn.disabled = true;
            btn.title = 'Apartado';
        }

        // Reapply selection si este número estaba previamente seleccionado
        if (selectedNumbersGlobal.has(i)) {
            btn.classList.add('selected');
        }

        grid.appendChild(btn);
    }
}

function manejarCambioRango(boton) {
    document.querySelectorAll('.rango-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    boton.classList.add('active');
    
    const inicio = parseInt(boton.getAttribute('data-inicio'));
    const fin = parseInt(boton.getAttribute('data-fin'));
    renderRange(inicio, fin);
    // Después de renderizar, actualizar resumen/contador por si había selección previa
    actualizarContadorCarrito();
    actualizarResumenCompra();
}

// ===== BÚSQUEDA DE BOLETOS =====
function configurarBuscadorBoletos() {
    const inputBusqueda = document.getElementById('busquedaBoleto');
    const btnBuscar = document.getElementById('btnBuscarBoleto');
    const btnLimpiar = document.getElementById('btnLimpiarBusqueda');
    const resultadosDiv = document.getElementById('busquedaResultados');
    const resultadosList = document.getElementById('resultadosList');
    const rangoTotal = document.getElementById('rangoTotal');

    const totalTickets = (window.rifaplusConfig && window.rifaplusConfig.totalTickets) ? window.rifaplusConfig.totalTickets : 500;
    if (rangoTotal) rangoTotal.textContent = totalTickets;

    if (!inputBusqueda || !btnBuscar) return;

    // Ejecutar búsqueda al hacer click en botón
    btnBuscar.addEventListener('click', ejecutarBusqueda);

    // Ejecutar búsqueda al presionar Enter
    inputBusqueda.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            ejecutarBusqueda();
        }
    });

    // Limpiar búsqueda
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function() {
            inputBusqueda.value = '';
            resultadosDiv.style.display = 'none';
            resultadosList.innerHTML = '';
            inputBusqueda.focus();
        });
    }

    function ejecutarBusqueda() {
        const valor = inputBusqueda.value.trim();
        
        if (!valor) {
            rifaplusUtils.showFeedback('⚠️ Ingresa un número para buscar', 'warning');
            return;
        }

        const numero = parseInt(valor, 10);

        if (isNaN(numero) || numero < 1 || numero > totalTickets) {
            rifaplusUtils.showFeedback(`⚠️ Ingresa un número válido entre 1 y ${totalTickets}`, 'warning');
            resultadosDiv.style.display = 'none';
            return;
        }

        // Obtener estado del boleto (vendido, apartado, disponible)
        const sold = (window.rifaplusSoldNumbers && Array.isArray(window.rifaplusSoldNumbers)) ? window.rifaplusSoldNumbers : [];
        const reserved = (window.rifaplusReservedNumbers && Array.isArray(window.rifaplusReservedNumbers)) ? window.rifaplusReservedNumbers : [];

        const estaVendido = sold.includes(numero);
        const estaApartado = reserved.includes(numero);

        // Mostrar resultado
        mostrarResultadoBusqueda(numero, estaVendido, estaApartado);
    }

    function mostrarResultadoBusqueda(numero, vendido, apartado) {
        resultadosList.innerHTML = '';

        let statusText = '✅ Disponible';
        let statusClass = 'disponible';

        if (vendido) {
            statusText = '❌ Vendido';
            statusClass = 'vendido';
        } else if (apartado) {
            statusText = '⏳ Apartado';
            statusClass = 'apartado';
        }

        const resultadoHtml = `
            <div class="resultado-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f9fafb; border-radius: 0.5rem; margin-bottom: 0.5rem;">
                <div>
                    <span style="font-weight: 600; font-size: 1.1rem; color: var(--text-dark);">Boleto #${numero}</span>
                    <span style="display: block; font-size: 0.85rem; color: var(--text-light);">Estado: <strong style="color: ${vendido ? 'var(--danger)' : apartado ? 'var(--primary)' : 'var(--success)'}">${statusText}</strong></span>
                </div>
                ${!vendido && !apartado ? `<button class="btn-seleccionar-resultado" data-numero="${numero}" style="padding: 0.5rem 1rem; background: var(--success); color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 600; transition: var(--transition-fast);">Seleccionar</button>` : ''}
            </div>
        `;

        resultadosList.insertAdjacentHTML('beforeend', resultadoHtml);

        // Añadir event listener al botón de seleccionar
        const btnSeleccionar = resultadosList.querySelector(`[data-numero="${numero}"]`);
        if (btnSeleccionar) {
            btnSeleccionar.addEventListener('click', function() {
                // Buscar en la grilla el botón del número y hacer click
                const botonNumero = document.querySelector(`.numero-btn[data-numero="${numero}"]`);
                if (botonNumero && !botonNumero.classList.contains('sold') && !botonNumero.classList.contains('reserved')) {
                    botonNumero.click();
                    rifaplusUtils.showFeedback(`✅ Boleto #${numero} seleccionado`, 'success');
                } else {
                    rifaplusUtils.showFeedback(`⚠️ Boleto #${numero} no disponible o ya seleccionado`, 'warning');
                }
            });
        }

        resultadosDiv.style.display = 'block';
    }
}

// ===== CARRITO EXPANDIBLE =====
function inicializarCarrito() {
    const carritoNav = document.getElementById('carritoNav');
    const carritoModal = document.getElementById('carritoModal');
    const closeCarrito = document.getElementById('closeCarrito');
    const btnSeguirComprando = document.getElementById('btnSeguirComprando');
    const btnProcederCarrito = document.getElementById('btnProcederCarrito');

    if (!carritoNav || !carritoModal) return;

    // Abrir carrito al hacer click en el icono
    carritoNav.addEventListener('click', function() {
        carritoModal.classList.add('active');
        actualizarVistaCarrito();
    });

    // Cerrar carrito
    closeCarrito.addEventListener('click', cerrarCarrito);
    carritoModal.addEventListener('click', function(e) {
        if (e.target === carritoModal) {
            cerrarCarrito();
        }
    });

    // Botón "Seguir comprando"
    btnSeguirComprando.addEventListener('click', cerrarCarrito);

    // Botón "Proceder al pago"
    btnProcederCarrito.addEventListener('click', function() {
        cerrarCarrito();
        const btnComprar = document.getElementById('btnComprar');
        if (btnComprar) {
            btnComprar.click();
        }
    });

    // Tecla Escape para cerrar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && carritoModal.classList.contains('active')) {
            cerrarCarrito();
        }
    });
}

function cerrarCarrito() {
    const carritoModal = document.getElementById('carritoModal');
    if (carritoModal) {
        carritoModal.classList.remove('active');
    }
}

function actualizarVistaCarrito() {
    const carritoItems = document.getElementById('carritoItems');
    const carritoVacio = document.getElementById('carritoVacio');
    const carritoLista = document.getElementById('carritoLista');
    const carritoResumen = document.getElementById('carritoResumen');
    const carritoResumenCantidad = document.getElementById('carritoResumenCantidad');
    const carritoResumenDescuento = document.getElementById('carritoResumenDescuento');
    const carritoResumenTotal = document.getElementById('carritoResumenTotal');
    const btnProcederCarrito = document.getElementById('btnProcederCarrito');

    carritoItems.innerHTML = '';

    if (selectedNumbersGlobal.size === 0) {
        carritoVacio.style.display = 'flex';
        carritoLista.style.display = 'none';
        carritoResumen.style.display = 'none';
        btnProcederCarrito.disabled = true;
        return;
    }

    carritoVacio.style.display = 'none';
    carritoLista.style.display = 'block';
    carritoResumen.style.display = 'flex';
    btnProcederCarrito.disabled = false;

    // Crear lista de boletos ordenados
    const numerosOrdenados = Array.from(selectedNumbersGlobal).sort((a, b) => a - b);
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
            // Buscar y activar el botón del número en la grilla (si existe)
            const botonNumero = document.querySelector(`.numero-btn[data-numero="${numero}"]`);
            if (botonNumero) {
                botonNumero.click();
            } else {
                if (typeof removerBoletoSeleccionado === 'function') {
                    removerBoletoSeleccionado(numero);
                }
            }
            actualizarVistaCarrito();
        });
    });

    // Actualizar resumen
    const calcTotal = rifaplusUtils.calcularDescuento(selectedNumbersGlobal.size, precioUnitario);
    if (carritoResumenCantidad) carritoResumenCantidad.textContent = calcTotal.cantidadBoletos;
    const subtotalEl = document.getElementById('carritoResumenSubtotal');
    if (subtotalEl) subtotalEl.textContent = `$${calcTotal.subtotal.toFixed(2)}`;
    if (carritoResumenDescuento) carritoResumenDescuento.textContent = `$${calcTotal.descuentoMonto.toFixed(2)}`;
    if (carritoResumenTotal) carritoResumenTotal.textContent = `$${calcTotal.totalFinal.toFixed(2)}`;
}

// Actualizar resumen poco después de cargar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(actualizarResumenCompra, 100);
});
