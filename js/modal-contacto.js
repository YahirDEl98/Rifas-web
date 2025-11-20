// modal-contacto.js - Gestión del modal de formulario de contacto

function abrirModalContacto() {
    const modal = document.getElementById('modalContacto');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevenir scroll
        limpiarFormularioContacto();
    }
}

function cerrarModalContacto() {
    const modal = document.getElementById('modalContacto');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto'; // Restaurar scroll
    }
}

function limpiarFormularioContacto() {
    const form = document.getElementById('formularioContacto');
    if (form) {
        form.reset();
        // Limpiar mensajes de error
        document.querySelectorAll('.form-error').forEach(error => {
            error.textContent = '';
        });
    }
}

function validarFormularioContacto() {
    const nombre = document.getElementById('clienteNombre').value.trim();
    const apellidos = document.getElementById('clienteApellidos').value.trim();
    const whatsapp = document.getElementById('clienteWhatsapp').value.trim();
    const estadoEl = document.getElementById('clienteEstado');
    const estado = estadoEl ? (estadoEl.value || '').trim() : '';
    const ciudadEl = document.getElementById('clienteCiudad');
    const ciudad = ciudadEl ? ciudadEl.value.trim() : '';
    
    let valido = true;
    
    // Validar nombre
    if (!nombre || nombre.length < 2) {
        document.getElementById('errorNombre').textContent = 'El nombre debe tener al menos 2 caracteres';
        valido = false;
    } else {
        document.getElementById('errorNombre').textContent = '';
    }
    
    // Validar apellidos
    if (!apellidos || apellidos.length < 2) {
        document.getElementById('errorApellidos').textContent = 'Los apellidos deben tener al menos 2 caracteres';
        valido = false;
    } else {
        document.getElementById('errorApellidos').textContent = '';
    }
    
    // Validar WhatsApp: exigir exactamente 10 dígitos (solo números)
    const whatsappDigits = whatsapp.replace(/\D/g, '');
    if (!whatsappDigits || whatsappDigits.length !== 10) {
        document.getElementById('errorWhatsapp').textContent = 'Ingresa exactamente 10 dígitos para WhatsApp';
        valido = false;
    } else {
        document.getElementById('errorWhatsapp').textContent = '';
    }

    // Validar estado (obligatorio)
    if (!estado) {
        document.getElementById('errorEstado').textContent = 'Selecciona tu estado';
        valido = false;
    } else {
        document.getElementById('errorEstado').textContent = '';
    }

    // Validar ciudad/localidad (obligatorio)
    if (!ciudad || ciudad.length < 2) {
        document.getElementById('errorCiudad').textContent = 'Por favor indica tu ciudad o localidad';
        valido = false;
    } else {
        document.getElementById('errorCiudad').textContent = '';
    }
    
    return valido;
}

function generarIdOrden() {
    // Generar ID único usando UUIDv4 y evitar duplicados mediante registro en localStorage
    function uuidv4() {
        // simple UUIDv4 generator
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    const usedKey = 'rifaplus_used_order_ids';
    let used = [];
    try {
        used = JSON.parse(localStorage.getItem(usedKey) || '[]');
    } catch (e) {
        used = [];
    }

    let id;
    let attempts = 0;
    do {
        id = `RIFA-${uuidv4().toUpperCase().slice(0, 8)}`; // shorter, readable token
        attempts++;
        if (attempts > 10) {
            // fallback to timestamp-based if extremely unlucky
            id = `RIFA-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            break;
        }
    } while (used.includes(id));

    // Register as used
    used.push(id);
    try {
        localStorage.setItem(usedKey, JSON.stringify(used));
    } catch (e) {
        // ignore storage errors
    }

    return id;
}

function guardarClienteEnStorage(nombre, apellidos, whatsapp, estado, ciudad) {
    const clienteData = {
        nombre,
        apellidos,
        whatsapp,
        estado: estado || undefined,
        ciudad: ciudad || undefined,
        ordenId: generarIdOrden(),
        fecha: new Date().toISOString()
    };
    localStorage.setItem('rifaplus_cliente', JSON.stringify(clienteData));
    return clienteData;
}

function obtenerClienteDelStorage() {
    const data = localStorage.getItem('rifaplus_cliente');
    return data ? JSON.parse(data) : null;
}

function guardarBoletoSeleccionadosEnStorage() {
    // Guardar números seleccionados para que aparezcan en la orden
    const boletos = Array.from(selectedNumbersGlobal);
    localStorage.setItem('rifaplus_boletos', JSON.stringify(boletos));
}

// Configurar event listeners del modal de contacto
document.addEventListener('DOMContentLoaded', function() {
    const btnCancelarContacto = document.getElementById('btnCancelarContacto');
    const btnContinuarContacto = document.getElementById('btnContinuarContacto');
    const closeContacto = document.getElementById('closeContacto');
    const formularioContacto = document.getElementById('formularioContacto');
    
    // Cerrar modal
    if (btnCancelarContacto) {
        btnCancelarContacto.addEventListener('click', cerrarModalContacto);
    }
    
    if (closeContacto) {
        closeContacto.addEventListener('click', cerrarModalContacto);
    }
    
    // Cerrar al hacer click fuera del modal (en el overlay)
    const modalOverlay = document.getElementById('modalContacto');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                cerrarModalContacto();
            }
        });
    }
    
    // Continuar (validar y proceder a orden)
    if (btnContinuarContacto) {
        btnContinuarContacto.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (validarFormularioContacto()) {
                const nombre = document.getElementById('clienteNombre').value.trim();
                const apellidos = document.getElementById('clienteApellidos').value.trim();
                const whatsapp = document.getElementById('clienteWhatsapp').value.trim();
                const estado = document.getElementById('clienteEstado') ? document.getElementById('clienteEstado').value : '';
                const ciudad = document.getElementById('clienteCiudad') ? document.getElementById('clienteCiudad').value.trim() : '';

                // Guardar en storage (estado y ciudad obligatorios)
                guardarClienteEnStorage(nombre, apellidos, whatsapp, estado, ciudad);
                guardarBoletoSeleccionadosEnStorage();
                
                // Redirigir a página de orden
                window.location.href = 'orden.html';
            } else {
                rifaplusUtils.showFeedback('⚠️ Por favor completa correctamente el formulario', 'warning');
            }
        });
    }
    
    // Permitir Enter para enviar
    if (formularioContacto) {
        formularioContacto.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                btnContinuarContacto.click();
            }
        });
    }
});

// Exportar función para que compra.js pueda usarla
// (o ya está disponible globalmente)
