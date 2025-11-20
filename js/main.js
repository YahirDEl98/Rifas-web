// ====================================
// INICIALIZACIÓN PRINCIPAL
// ====================================

/**
 * ESTRUCTURA DE PROMOCIONES (PAQUETES FIJOS):
 * - Paquete 10: 10 boletos por $450 (ahorro de $50)
 * - Paquete 20: 20 boletos por $800 (ahorro de $200)
 * - Boletos sueltos: Resto a precio normal $50 c/u
 * 
 * Ejemplos:
 * - 10 boletos = $450 (promo)
 * - 11 boletos = $450 (promo 10) + $50 (1 suelto) = $500
 * - 15 boletos = $450 (promo 10) + $250 (5 sueltos) = $700
 * - 20 boletos = $800 (promo)
 * - 21 boletos = $800 (promo 20) + $50 (1 suelto) = $850
 * - 30 boletos = $800 (promo 20) + $500 (10 sueltos) = $1300
 */

// Configuración global del sitio (puede ajustarse desde aquí)
window.rifaplusConfig = {
    ticketPrice: 50,        // Precio por boleto en pesos
    totalTickets: 500,      // Total de boletos en la rifa
    orderCounter: 1,        // Contador secuencial para órdenes
    
    // WhatsApp del organizador (recibe confirmaciones de pago)
    numeroWhatsappOrganizador: '+52 4591153960',
    nombreOrganizador: 'RifaPlus Organizador',
    
    // API Backend para enviar PDFs por WhatsApp
    apiEndpoint: 'http://localhost:3000/api',  // Cambiar por URL producción
    
    bankAccounts: [         // Cuentas bancarias disponibles
        {
            id: 1,
            bank: 'Banco Mercantil',
            accountNumber: '0152-0000-0012345678-9',
            accountType: 'Corriente',
            beneficiary: 'Juan Carlos López García',
            phone: '+52 449 123 4567'
        },
        {
            id: 2,
            bank: 'Banco del Caribe',
            accountNumber: '0104-0000-0087654321-5',
            accountType: 'Corriente',
            beneficiary: 'María Fernanda Rodríguez',
            phone: '+52 449 987 6543'
        },
        {
            id: 3,
            bank: 'Banesco',
            accountNumber: '0128-0000-0056789012-3',
            accountType: 'Ahorros',
            beneficiary: 'Carlos Manuel Pérez López',
            phone: '+52 449 456 7890'
        }
    ]
};

// Normalizar `apiEndpoint` para evitar inconsistencias en distintos módulos.
(function normalizeApiConfig() {
    try {
        let ep = String(window.rifaplusConfig.apiEndpoint || 'http://localhost:3000');
        // remove trailing slashes
        ep = ep.replace(/\/+$/,'');

        // Keep `apiEndpoint` as provided (for modules that expect it includes `/api`),
        // but expose a normalized `apiBase` (sin `/api`) and a helper `buildApi`.
        window.rifaplusConfig.apiEndpoint = ep;
        window.rifaplusConfig.apiBase = ep.replace(/\/api$/, '');

        window.rifaplusConfig.buildApi = function(path) {
            if (!path) return ep;
            const p = path.startsWith('/') ? path : '/' + path;
            // If path already starts with /api, use apiBase + path to avoid /api/api
            if (p.startsWith('/api')) {
                return window.rifaplusConfig.apiBase + p;
            }
            // Otherwise append to configured apiEndpoint
            return window.rifaplusConfig.apiEndpoint + p;
        };
    } catch (e) {
        // noop
    }
})();

// Sistema de utilidades global
window.rifaplusUtils = {
    showLoading: function(element) {
        if (element) {
            element.classList.add('loading');
        }
    },
    
    hideLoading: function(element) {
        if (element) {
            element.classList.remove('loading');
        }
    },
    
    showFeedback: function(message, type = 'success') {
        const feedback = document.createElement('div');
        feedback.className = `feedback feedback--${type}`;
        feedback.textContent = message;
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.animation = 'slideOutRight var(--transition-fast) forwards';
            setTimeout(() => feedback.remove(), 200);
        }, 3000);
    },
    
    /**
     * Calcula el precio con paquetes promocionales
     * Estructura de paquetes:
     * - Paquete 10: 10 boletos por $450
     * - Paquete 20: 20 boletos por $800
     * - Boletos restantes: $50 c/u
     */
    calcularDescuento: function(cantidad, precioUnitario = 50) {
        let totalFinal = 0;
        let descuentoMonto = 0;
        let desglose = '';
        
        let boletosRestantes = cantidad;
        
        // Aplicar paquete de 20 (si aplica)
        if (boletosRestantes >= 20) {
            const paquetes20 = Math.floor(boletosRestantes / 20);
            totalFinal += paquetes20 * 800;  // $800 por cada paquete de 20
            descuentoMonto += paquetes20 * (20 * precioUnitario - 800);  // Ahorro: $200 por paquete
            boletosRestantes -= paquetes20 * 20;
        }
        
        // Aplicar paquete de 10 (si aplica)
        if (boletosRestantes >= 10) {
            totalFinal += 450;  // $450 por paquete de 10
            descuentoMonto += (10 * precioUnitario - 450);  // Ahorro: $50
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
};

document.addEventListener('DOMContentLoaded', function() {
    
    // Inicializar módulos inteligentes:
    // Cada función verifica si sus elementos existen antes de ejecutarse
    // Esto permite cargar main.js en todas las páginas sin overhead
    
    initCarousel();        // Solo se ejecuta si existen elementos .carrusel
    initCountdown();       // Solo se ejecuta si existe .countdown-timer
    initCart();            // Solo se ejecuta si existe #numerosGrid
    initFAQ();             // Solo se ejecuta si existe .faq-items
    initSmoothScroll();    // Universal (enlaces con #)
    initScrollAnimations();// Universal (agrega observers)
    initNavigation();      // Universal (menú navegación)
    initMobileMenu();      // Universal (menú móvil)
    
});

// ====================================
// CARRUSEL FUNCIONALIDAD
// ====================================

function initCarousel() {
    const slides = document.querySelectorAll('.carrusel-item');
    const nextBtn = document.querySelector('.carrusel-next');
    const prevBtn = document.querySelector('.carrusel-prev');
    
    if (slides.length === 0) {
        // No hay slides para el carrusel
        return;
    }

    let currentSlide = 0;
    const totalSlides = slides.length;
    let autoSlideInterval;

    function showSlide(n) {
        // Remover clase active de todos los slides
        slides.forEach(slide => {
            slide.classList.remove('active');
            slide.style.opacity = '0';
        });
        
        // Agregar clase active al slide actual
        slides[n].classList.add('active');
        slides[n].style.opacity = '1';
        currentSlide = n;
    }

    function nextSlide() {
        const next = (currentSlide + 1) % totalSlides;
        showSlide(next);
    }

    function prevSlide() {
        const prev = (currentSlide - 1 + totalSlides) % totalSlides;
        showSlide(prev);
    }

    // Event listeners para botones
    if (nextBtn) {
        nextBtn.addEventListener('click', nextSlide);
        nextBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            nextSlide();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', prevSlide);
        prevBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            prevSlide();
        });
    }

    // Auto-avance del carrusel
    function startAutoSlide() {
        if (totalSlides > 1) {
            autoSlideInterval = setInterval(nextSlide, 5000);
        }
    }

    function stopAutoSlide() {
        if (autoSlideInterval) {
            clearInterval(autoSlideInterval);
            autoSlideInterval = null;
        }
    }

    // Pausar auto-slide al interactuar
    const carousel = document.querySelector('.carrusel');
    if (carousel) {
        carousel.addEventListener('mouseenter', stopAutoSlide);
        carousel.addEventListener('mouseleave', startAutoSlide);
        carousel.addEventListener('touchstart', stopAutoSlide);
        carousel.addEventListener('touchend', () => {
            setTimeout(startAutoSlide, 3000);
        });
    }

    // Iniciar carrusel
    startAutoSlide();
    showSlide(0);
    
    // Carrusel inicializado
}

// ====================================
// CUENTA REGRESIVA - FECHA 2025
// ====================================

function initCountdown() {
    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minutesEl = document.getElementById('countdown-minutes');
    const secondsEl = document.getElementById('countdown-seconds');

    // Verificar que existen los elementos del countdown
    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) {
        // Elementos de cuenta regresiva no encontrados, salir silenciosamente
        return;
    }

    // Fecha del sorteo: 15 de Diciembre de 2025 a las 20:00 (8:00 PM)
    const targetDate = new Date('2025-12-15T20:00:00-06:00').getTime(); // Hora Centro México

    function updateCountdown() {
        const now = new Date().getTime();
        const difference = targetDate - now;

        if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            // Actualizar elementos con formato de 2 dígitos
            daysEl.textContent = String(days).padStart(2, '0');
            hoursEl.textContent = String(hours).padStart(2, '0');
            minutesEl.textContent = String(minutes).padStart(2, '0');
            secondsEl.textContent = String(seconds).padStart(2, '0');

            // Efectos visuales cuando quedan pocos días (protegidos por guardas)
            const countdownSection = document.querySelector('.countdown-section');
            if (days <= 7 && countdownSection) {
                countdownSection.style.background = 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #EF4444 100%)';
            }

            const urgencyText = document.querySelector('.urgency-text');
            if (days <= 3 && urgencyText) {
                urgencyText.style.animation = 'pulse 1s ease-in-out infinite';
            }
        } else {
            // El sorteo ya ocurrió
            daysEl.textContent = '00';
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';
            
            // Mostrar mensaje de sorteo terminado
            const countdownTimer = document.querySelector('.countdown-timer');
            if (countdownTimer && !countdownTimer.querySelector('.sorteo-terminado')) {
                countdownTimer.innerHTML = `
                    <div class="sorteo-terminado" style="
                        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                        color: white;
                        padding: 2rem;
                        border-radius: var(--radius-lg);
                        font-size: 1.5rem;
                        font-weight: 700;
                        text-align: center;
                    ">
                        🎉 ¡EL SORTEO HA TERMINADO!
                    </div>
                `;
            }
        }
    }

    // Actualizar inmediatamente y cada segundo
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);
    
    // Cuenta regresiva inicializada
}

// ====================================
// CARRITO DE COMPRAS
// ====================================

function initCart() {
    let cart = JSON.parse(localStorage.getItem('rifaplus-carrito')) || [];
    
    function updateCartCount() {
        const countElement = document.querySelector('.carrito-count');
        if (countElement) {
            countElement.textContent = cart.length;
            // Actualizar texto para screen readers
            const srOnly = countElement.nextElementSibling;
            if (srOnly && srOnly.classList.contains('sr-only')) {
                srOnly.textContent = `${cart.length} items en el carrito`;
            }
        }
    }

    function saveCart() {
        localStorage.setItem('rifaplus-carrito', JSON.stringify(cart));
        updateCartCount();
    }

    // Funciones públicas para otras páginas
    window.rifaplusCart = {
        addItem: function(item) {
            cart.push({
                ...item,
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                fecha: new Date().toISOString()
            });
            saveCart();
            rifaplusUtils.showFeedback('✅ Boleto agregado al carrito');
        },
        
        removeItem: function(itemId) {
            cart = cart.filter(item => item.id !== itemId);
            saveCart();
            rifaplusUtils.showFeedback('🗑️ Boleto removido del carrito');
        },
        
        getItems: function() {
            return [...cart];
        },
        
        clear: function() {
            cart = [];
            saveCart();
            rifaplusUtils.showFeedback('🛒 Carrito vaciado');
        }
    };

    // Navegación al carrito
    const carritoNav = document.getElementById('carritoNav');
    if (carritoNav) {
        carritoNav.addEventListener('click', function() {
            // En una implementación real, esto llevaría a la página del carrito
        });
    }

    updateCartCount();
    // Sistema de carrito inicializado
}

// ====================================
// FAQ - ACORDEÓN
// ====================================

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (faqItems.length === 0) {
        // No hay items FAQ
        return;
    }

    faqItems.forEach((item, index) => {
        const pregunta = item.querySelector('.faq-pregunta');
        const respuesta = item.querySelector('.faq-respuesta');
        
        if (pregunta && respuesta) {
            // Configurar altura inicial
            if (!item.classList.contains('active')) {
                respuesta.style.maxHeight = '0';
                respuesta.style.overflow = 'hidden';
            }
            
            pregunta.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Cerrar todos los items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        const otherRespuesta = otherItem.querySelector('.faq-respuesta');
                        if (otherRespuesta) {
                            otherRespuesta.style.maxHeight = '0';
                        }
                    }
                });
                
                // Alternar item actual
                item.classList.toggle('active');
                
                if (!isActive) {
                    respuesta.style.maxHeight = respuesta.scrollHeight + 'px';
                } else {
                    respuesta.style.maxHeight = '0';
                }
            });
            
            // Keyboard accessibility
            pregunta.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    pregunta.click();
                }
            });
            
            pregunta.setAttribute('tabindex', '0');
            pregunta.setAttribute('role', 'button');
            pregunta.setAttribute('aria-expanded', 'false');
            pregunta.setAttribute('aria-controls', `faq-respuesta-${index}`);
            respuesta.id = `faq-respuesta-${index}`;
        }
    });
    
    // FAQ inicializado
}

// ====================================
// SCROLL SUAVE
// ====================================

function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    if (links.length === 0) return;

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href === '#' || href === '#0') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                
                const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
                const targetPosition = target.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Actualizar URL sin recargar la página
                history.pushState(null, null, href);
            }
        });
    });
    
    // Scroll suave inicializado
}

// ====================================
// ANIMACIONES AL SCROLL
// ====================================

function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.precio-card, .info-item, .contacto-card');
    
    if (animatedElements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => {
        // Añadir clase que controla el estado inicial de la animación.
        // Si JS no corre, no se añade la clase y los elementos quedan visibles.
        el.classList.add('will-animate');
        observer.observe(el);
    });
    
    // Animaciones de scroll inicializadas
}

// ====================================
// NAVEGACIÓN ACTIVA
// ====================================

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    if (navLinks.length === 0) return;

    function setActiveLink() {
        const fromTop = window.scrollY + 100;
        let currentActive = null;
        
        navLinks.forEach(link => {
            const section = document.querySelector(link.getAttribute('href'));
            if (section) {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                
                if (fromTop >= sectionTop && fromTop < sectionTop + sectionHeight) {
                    currentActive = link;
                }
            }
        });
        
        // Solo actualizar si hay un cambio
        if (currentActive && !currentActive.classList.contains('active')) {
            navLinks.forEach(l => l.classList.remove('active'));
            currentActive.classList.add('active');
        }
    }

    // Throttle para mejor performance
    let scrollTimeout;
    function throttledSetActive() {
        if (!scrollTimeout) {
            scrollTimeout = setTimeout(() => {
                scrollTimeout = null;
                setActiveLink();
            }, 100);
        }
    }

    window.addEventListener('scroll', throttledSetActive);
    setActiveLink(); // Ejecutar al cargar
    
    // Navegación activa inicializada
}

// ====================================
// MENÚ MÓVIL
// ====================================

function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const overlayMenu = document.getElementById('overlayMenu');
    const overlayClose = document.getElementById('overlayClose');

    if (!hamburger || !overlayMenu) {
        // Elementos del menú móvil no encontrados
        return;
    }

    function openOverlay() {
        overlayMenu.classList.add('show');
        overlayMenu.setAttribute('aria-hidden', 'false');
        hamburger.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        
        // Animación del icono hamburguesa a X
        const hamburgerInner = hamburger.querySelector('.hamburger-inner');
        if (hamburgerInner) {
            hamburgerInner.style.transform = 'rotate(45deg)';
            hamburgerInner.style.backgroundColor = 'var(--secondary)';
        }
    }

    function closeOverlay() {
        overlayMenu.classList.remove('show');
        overlayMenu.setAttribute('aria-hidden', 'true');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        
        // Animación del icono X a hamburguesa
        const hamburgerInner = hamburger.querySelector('.hamburger-inner');
        if (hamburgerInner) {
            hamburgerInner.style.transform = 'rotate(0)';
            hamburgerInner.style.backgroundColor = 'white';
        }
    }

    // Event listeners
    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = overlayMenu.classList.contains('show');
        if (isOpen) {
            closeOverlay();
        } else {
            openOverlay();
        }
    });

    if (overlayClose) {
        overlayClose.addEventListener('click', closeOverlay);
    }

    // Cerrar con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlayMenu.classList.contains('show')) {
            closeOverlay();
        }
    });

    // Cerrar al hacer click fuera del contenido
    overlayMenu.addEventListener('click', (e) => {
        if (e.target === overlayMenu) {
            closeOverlay();
        }
    });

    // Cerrar al hacer click en enlaces del overlay
    const overlayLinks = overlayMenu.querySelectorAll('.overlay-link');
    overlayLinks.forEach(link => {
        link.addEventListener('click', closeOverlay);
    });

    // Menú móvil inicializado
}

// ====================================
// MANEJO DE ERRORES GLOBALES
// ====================================

window.addEventListener('error', function(e) {
    console.error('❌ Error global:', e.error);
});

// Prevenir errores de consola en producción
if (typeof console === "undefined" || typeof console.log === "undefined") {
    console = {};
    console.log = console.warn = console.error = function(){};
}

