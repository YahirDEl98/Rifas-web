# E2E Tests - RifaPlus

Suite E2E con Playwright que automatiza el flujo compra -> orden -> admin confirma.

Requisitos previos:
- Node.js 18+ y npm
- Backend corriendo en `http://localhost:3000` (ejecuta `node backend/server.js` o `npm start` desde la raíz si está configurado)
- Servidor estático del frontend en `http://localhost:8080` (desde la raíz del proyecto ejecuta `python3 -m http.server 8080`)

Instalación y ejecución:

```bash
cd e2e
npm install
npx playwright install
npm test
```

Notas:
- La suite asume que existe un usuario admin con credenciales `admin` / `admin123` (seed creado en `backend/db/seeds`).
- Si tus puertos son distintos, actualiza `e2e/playwright.config.js` o exporta `PLAYWRIGHT_TEST_BASE_URL`.
- Las pruebas corren en modo `headless` por defecto; puedes editar `playwright.config.js` para ver navegador en modo `headed`.

Resultados:
- Playwright generará trazas en `./playwright-report` si la prueba falla (ver config). 
- Si necesitas más escenarios (descuentos, intentos fallidos, rate-limit), puedo agregarlos.
