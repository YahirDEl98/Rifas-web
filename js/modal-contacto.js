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
    const emailEl = document.getElementById('clienteEmail');
    const email = emailEl ? emailEl.value.trim() : '';
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
    
    // Validar WhatsApp (formato básico: números, espacios, +, -)
    const whatsappRegex = /^[+]?[0-9\s\-()]{7,}$/;
    if (!whatsapp || !whatsappRegex.test(whatsapp)) {
        document.getElementById('errorWhatsapp').textContent = 'Por favor ingresa un número de WhatsApp válido';
        valido = false;
    } else {
        document.getElementById('errorWhatsapp').textContent = '';
    }

    // Validar email (opcional) - si se proporciona debe ser válido
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            if (emailEl) emailEl.classList.add('invalid');
            document.getElementById('errorEmail').textContent = 'Por favor ingresa un correo electrónico válido';
            valido = false;
        } else {
            if (emailEl) emailEl.classList.remove('invalid');
            document.getElementById('errorEmail').textContent = '';
        }
    } else {
        // limpiar error si no hay email
        document.getElementById('errorEmail').textContent = '';
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
    // Generar ID único usando timestamp (garantiza unicidad y evita duplicados)
    const timestamp = Date.now();
    const id = `RIFA-${timestamp}`;
    return id;
}

function guardarClienteEnStorage(nombre, apellidos, whatsapp, email, estado, ciudad) {
    const clienteData = {
        nombre,
        apellidos,
        whatsapp,
        email: email || undefined,
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
                const email = document.getElementById('clienteEmail') ? document.getElementById('clienteEmail').value.trim() : '';
                const estado = document.getElementById('clienteEstado') ? document.getElementById('clienteEstado').value : '';
                const ciudad = document.getElementById('clienteCiudad') ? document.getElementById('clienteCiudad').value.trim() : '';

                // Guardar en storage (incluyendo email, estado y ciudad si fueron provistos)
                guardarClienteEnStorage(nombre, apellidos, whatsapp, email, estado, ciudad);
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
