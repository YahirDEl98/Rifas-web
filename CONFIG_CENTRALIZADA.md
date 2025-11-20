# 🎯 Sistema de Configuración Centralizada - SORTEOS YEPE

## Descripción

El sistema de configuración centralizado permite cambiar el logo y otras variables del sitio en **un solo lugar**, y los cambios se aplican automáticamente en todas las páginas.

## 📝 Archivo de Configuración

**Ubicación:** `js/config.js`

Este archivo contiene todas las variables globales del sitio:

```javascript
const SITE_CONFIG = {
    LOGO_PATH: 'images/sorteos-yepe-logo.png',  // Ruta del logo
    LOGO_VERSION: '20251117',                    // Versión para cache-busting
    SITE_NAME: 'SORTEOS YEPE'                   // Nombre del sitio
};
```

## 🔄 Cómo Cambiar el Logo

### Opción 1: Cambiar solo la ruta del logo

Si solo quieres cambiar el archivo del logo a otro con el mismo nombre, solo actualiza la ruta:

```javascript
LOGO_PATH: 'images/tu-nuevo-logo.png'
```

**Resultado:** Todas las imágenes de logo en el sitio se actualizarán automáticamente.

### Opción 2: Cambiar la versión para forzar recarga de caché

Si el navegador está mostrando un logo antiguo en caché, aumenta el `LOGO_VERSION`:

```javascript
LOGO_VERSION: '20251118'  // cambiar a una fecha más nueva
```

**Resultado:** Los navegadores de los usuarios descargarán el nuevo logo sin caché.

### Opción 3: Cambiar ambos (recomendado)

Para máxima flexibilidad, cambia ambos:

```javascript
const SITE_CONFIG = {
    LOGO_PATH: 'images/nuevo-logo-cliente-x.png',
    LOGO_VERSION: '20251118',
    SITE_NAME: 'CLIENTE X SORTEOS'
};
```

## 🏗️ Cómo Funciona

1. El archivo `js/config.js` se carga en todas las páginas HTML (en el `<head>`).
2. Cuando la página carga, la función `updateAllLogos()` busca todos los elementos con `data-logo-src`.
3. Actualiza automáticamente el `src` de las imágenes con la ruta y versión del `SITE_CONFIG`.

## 📌 Páginas que Usan el Sistema

Las siguientes páginas tienen logos controlados por este sistema:

- ✅ `index.html` - Logo en header y footer
- ✅ `compra.html` - Logo en header
- ✅ `orden.html` - Logo en header

## 🎨 Agregar Nuevas Variables

Para agregar más variables al sistema (colores, textos, etc.), edita `js/config.js`:

```javascript
const SITE_CONFIG = {
    LOGO_PATH: 'images/sorteos-yepe-logo.png',
    LOGO_VERSION: '20251117',
    SITE_NAME: 'SORTEOS YEPE',
    
    // Nuevas variables
    PRIMARY_COLOR: '#7C3AED',
    SECONDARY_COLOR: '#F59E0B',
    SUPPORT_EMAIL: 'soporte@sorteos.com'
};
```

Luego accede desde JavaScript con:
```javascript
console.log(SITE_CONFIG.PRIMARY_COLOR);  // '#7C3AED'
console.log(SITE_CONFIG.SUPPORT_EMAIL);   // 'soporte@sorteos.com'
```

## 🚀 Ventajas

- **Mantenimiento simplificado:** Un solo lugar para cambiar el logo.
- **Múltiples clientes:** Fácil crear diferentes versiones del sitio con logos diferentes.
- **Cache-busting automático:** Versionado integrado para evitar problemas de caché.
- **Escalable:** Sistema listo para agregar más variables globales.

## 📋 Ejemplo: Crear Versión para Nuevo Cliente

Para crear una versión del sitio con logo diferente:

1. Sube el nuevo logo a `images/nuevo-cliente-logo.png`
2. Cambia `js/config.js`:
   ```javascript
   LOGO_PATH: 'images/nuevo-cliente-logo.png',
   LOGO_VERSION: '20251117',  // incrementar si es necesario
   SITE_NAME: 'SORTEOS DEL NUEVO CLIENTE'
   ```
3. ¡Listo! Todas las páginas reflejarán el cambio automáticamente.

---

**Última actualización:** 17 de noviembre de 2025
