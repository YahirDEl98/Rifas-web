// countdown.js - Actualiza la barra de progreso y mensajes según boletos vendidos

// Configuración
const CONFIG = {
    totalBoletos: 500,
    fechaSorteo: new Date('2025-12-15T00:00:00').getTime(),
    apiEndpoint: 'http://localhost:3000'
};

// Actualizar countdown cada segundo
function actualizarCountdown() {
    const ahora = new Date().getTime();
    const diferencia = CONFIG.fechaSorteo - ahora;

    if (diferencia <= 0) {
        // Si el sorteo ya pasó
        document.getElementById('countdown-days').textContent = '00';
        document.getElementById('countdown-hours').textContent = '00';
        document.getElementById('countdown-minutes').textContent = '00';
        document.getElementById('countdown-seconds').textContent = '00';
        return;
    }

    // Calcular días, horas, minutos, segundos
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

    document.getElementById('countdown-days').textContent = String(dias).padStart(2, '0');
    document.getElementById('countdown-hours').textContent = String(horas).padStart(2, '0');
    document.getElementById('countdown-minutes').textContent = String(minutos).padStart(2, '0');
    document.getElementById('countdown-seconds').textContent = String(segundos).padStart(2, '0');
}

// Actualizar barra de progreso con datos reales desde la API pública
async function actualizarBarraProgreso() {
    try {
        // Prefer global config if available (normalized in `js/main.js`)
        const globalBase = (window.rifaplusConfig && window.rifaplusConfig.apiBase) ? window.rifaplusConfig.apiBase : null;
        const base = globalBase || CONFIG.apiEndpoint;
        const respuesta = await fetch(`${base}/api/public/ordenes-stats`);

        if (!respuesta.ok) {
            console.warn('No se pudo obtener datos de órdenes (modo offline)');
            actualizarUI(0, CONFIG.totalBoletos);
            return;
        }

        const datos = await respuesta.json();
        
        if (datos.success && datos.data) {
            const boletosVendidos = datos.data.total_boletos_vendidos || 0;
            actualizarUI(boletosVendidos, CONFIG.totalBoletos);
        } else {
            actualizarUI(0, CONFIG.totalBoletos);
        }
    } catch (error) {
        console.error('Error fetching ordenes-stats:', error);
        actualizarUI(0, CONFIG.totalBoletos);
    }
}

// Actualizar UI con los datos de boletos vendidos
function actualizarUI(boletosVendidos, totalBoletos) {
    const boletosRestantes = totalBoletos - boletosVendidos;
    const porcentaje = Math.round((boletosVendidos / totalBoletos) * 100);

    // Actualizar números
    document.getElementById('boletos-vendidos').textContent = boletosVendidos;
    document.getElementById('boletos-restantes').textContent = boletosRestantes;
    document.getElementById('porcentaje-vendido').textContent = `${porcentaje}%`;

    // Actualizar barra de progreso con color dinámico
    const progressFill = document.getElementById('progress-fill');
    progressFill.style.width = `${porcentaje}%`;

    // Cambiar color según el porcentaje
    if (porcentaje < 50) {
        progressFill.style.background = 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'; // Verde
    } else if (porcentaje < 75) {
        progressFill.style.background = 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)'; // Naranja
    } else {
        progressFill.style.background = 'linear-gradient(90deg, #EF4444 0%, #F87171 100%)'; // Rojo
    }

    // Actualizar mensaje de urgencia dinámico
    actualizarMensajeUrgencia(porcentaje);
}

// Actualizar mensaje de urgencia según el porcentaje
function actualizarMensajeUrgencia(porcentaje) {
    const urgencyText = document.querySelector('.urgency-text');
    const countdownCard = document.querySelector('.countdown-card');

    if (!urgencyText) return;

    let mensaje = '';
    let clase = '';

    if (porcentaje < 50) {
        mensaje = '💡 ¡No pierdas esta oportunidad! Aún hay muchos boletos disponibles - Participa ahora';
        clase = 'urgency-low';
    } else if (porcentaje < 75) {
        mensaje = '⚠️ ¡SE AGOTAN LOS BOLETOS! Más del 50% ya vendido - ¡Asegura tu boleto ahora!';
        clase = 'urgency-medium';
    } else {
        mensaje = '🔥 ¡ÚLTIMAS OPORTUNIDADES! Más del 75% vendido - ¡Solo quedan ' + 
                  Math.round(100 - porcentaje) + '% disponibles!';
        clase = 'urgency-high';
    }

    urgencyText.textContent = mensaje;
    urgencyText.className = `urgency-text ${clase}`;

    // Aplicar animación según urgencia
    if (clase === 'urgency-high') {
        countdownCard.classList.add('urgent-pulse');
    } else {
        countdownCard.classList.remove('urgent-pulse');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Actualizar countdown cada segundo
    actualizarCountdown();
    setInterval(actualizarCountdown, 1000);

    // Actualizar barra de progreso cada 5 segundos
    actualizarBarraProgreso();
    setInterval(actualizarBarraProgreso, 5000);
});
