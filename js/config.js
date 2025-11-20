/**
 * CONFIGURACIÓN CENTRALIZADA DEL SITIO
 * Cambios aquí se aplican automáticamente en todo el sitio
 */

const SITE_CONFIG = {
    // Logo del sitio - cambiar aquí y se actualiza en todas partes
    LOGO_PATH: 'images/sorteos-yepe-logo.png',
    LOGO_VERSION: '20251117', // versión para cache-busting
    
    // Obtener URL del logo con versión
    getLogoUrl: function() {
        return `${this.LOGO_PATH}?v=${this.LOGO_VERSION}`;
    },
    
    // Nombre del sitio
    SITE_NAME: 'SORTEOS YEPE'
};

// Función para actualizar todos los logos en la página
function updateAllLogos() {
    const logoUrl = SITE_CONFIG.getLogoUrl();
    const logoElements = document.querySelectorAll('[data-logo-src]');
    
    logoElements.forEach(element => {
        if (element.tagName === 'IMG') {
            element.src = logoUrl;
            element.alt = SITE_CONFIG.SITE_NAME;
        } else if (element.tagName === 'A') {
            const img = element.querySelector('img');
            if (img) {
                img.src = logoUrl;
                img.alt = SITE_CONFIG.SITE_NAME;
            }
        }
    });
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAllLogos);
} else {
    updateAllLogos();
}
