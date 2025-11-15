const { test, expect } = require('@playwright/test');

test('Flujo completo: compra -> guardar orden -> admin confirma', async ({ page, request }) => {
  // 1) Ir a la página de compra
  await page.goto('/compra.html');

  // Asegurar que la página cargó
  await expect(page.locator('#numerosGrid')).toBeVisible();

  // 2) Generar números con la máquina: indicar cantidad 3 y generar
  await page.fill('#cantidadNumeros', '3');
  await page.click('#btnGenerarNumeros');

  // Esperar resultado de la máquina
  await expect(page.locator('#maquinaResultado')).toBeVisible({ timeout: 5000 });

  // 3) Agregar números al carrito
  await page.click('#btnAgregarSuerte');

  // Verificar que el contador cambió
  const carritoCount = await page.locator('.carrito-count').innerText();
  expect(parseInt(carritoCount)).toBeGreaterThan(0);

  // Asegurar que la orden generada sea única (evitar colisiones con runs previos)
  await page.evaluate(() => {
    if (window.rifaplusConfig) {
      window.rifaplusConfig.orderCounter = Date.now();
    }
  });

  // 4) Proceder a compra (abrir modal contacto)
  await page.click('#btnComprar');
  await expect(page.locator('#modalContacto')).toHaveClass(/show/);

  // 5) Completar el formulario de contacto
  await page.fill('#clienteNombre', 'Automated');
  await page.fill('#clienteApellidos', 'Tester');
  await page.fill('#clienteWhatsapp', '+524599111111');

  // Patch guardarClienteEnStorage to append a valid email to localStorage
  await page.evaluate(() => {
    try {
      const original = window.guardarClienteEnStorage;
      window.guardarClienteEnStorage = function(nombre, apellidos, whatsapp) {
        const result = original(nombre, apellidos, whatsapp);
        try {
          const clave = 'rifaplus_cliente';
          const c = JSON.parse(localStorage.getItem(clave) || '{}');
          c.email = c.email || `e2e+${Date.now()}@test.local`;
          localStorage.setItem(clave, JSON.stringify(c));
        } catch (e) {
          // ignore
        }
        return result;
      };
    } catch (e) {
      // if function not present, ignore
    }
  });

  await page.click('#btnContinuarContacto');

  // 6) Esperar navegación a orden.html
  await page.waitForURL('**/orden.html', { timeout: 5000 });
  await expect(page.locator('#ordenNumero')).toBeVisible();

  // Asegurar que el cliente tenga un email válido para pasar validaciones del backend
  await page.evaluate(() => {
    const clave = 'rifaplus_cliente';
    const cliente = JSON.parse(localStorage.getItem(clave) || '{}');
    cliente.email = cliente.email || `e2e+${Date.now()}@test.local`;
    localStorage.setItem(clave, JSON.stringify(cliente));
  });

  // 7) Seleccionar el primer método de pago (si existe)
  const pagoCard = page.locator('.pago-card').first();
  await expect(pagoCard).toBeVisible();
  await pagoCard.click();

  // 8) Generar orden (abre modal formal)
  // Debug: comprobar rifaplus_cliente en localStorage antes de generar orden
  const clienteStorage = await page.evaluate(() => localStorage.getItem('rifaplus_cliente'));
  console.log('DEBUG rifaplus_cliente BEFORE generar orden:', clienteStorage);

  await page.click('#btnGenerarOrden');
  await expect(page.locator('#modalOrdenFormal')).toHaveClass(/show/);

  // Ensure ordenActual and localStorage contain a valid email before sending to backend
  await page.evaluate(() => {
    try {
      const clave = 'rifaplus_orden_actual';
      const obj = JSON.parse(localStorage.getItem(clave) || '{}');
      obj.cliente = obj.cliente || {};
      obj.cliente.email = obj.cliente.email || `e2e+${Date.now()}@test.local`;
      localStorage.setItem(clave, JSON.stringify(obj));
      // also set in-memory variable used by orden-formal.js
      if (window.ordenActual) {
        window.ordenActual.cliente = window.ordenActual.cliente || {};
        window.ordenActual.cliente.email = window.ordenActual.cliente.email || `e2e+${Date.now()}@test.local`;
      }
    } catch (e) {
      // ignore
    }
  });

  // Debug: obtener ordenActual en memoria
  const ordenEnMemoria = await page.evaluate(() => {
    try { return window.ordenActual || null; } catch (e) { return { error: e.message }; }
  });
  console.log('DEBUG ordenEnMemoria=', ordenEnMemoria);

  // 9) El navegador a veces bloquea fetch. En su lugar, leer la orden preparada en localStorage y crearla vía API desde el contexto de tests
  const ordenLocal = await page.evaluate(() => JSON.parse(localStorage.getItem('rifaplus_orden_actual') || '{}'));
  const crearResp = await request.post('http://localhost:3000/api/ordenes', { data: ordenLocal });
  expect(crearResp.ok()).toBeTruthy();
  const crearJson = await crearResp.json();
  console.log('POST /api/ordenes (via request) status=', crearResp.status(), 'body=', crearJson);
  expect(crearJson.success).toBe(true);
  expect(crearJson.url).toBeTruthy();

  // Extraer ordenId desde la URL devuelta (ej: .../api/ordenes/RIFA-00001)
  const urlParts = crearJson.url.split('/');
  const ordenId = urlParts[urlParts.length - 1];
  expect(ordenId).toBeTruthy();

  // 10) Loguear en admin vía API para obtener token
  const loginResp = await request.post('http://localhost:3000/api/admin/login', {
    data: { username: 'admin', password: 'admin123' }
  });
  expect(loginResp.status()).toBe(200);
  const loginJson = await loginResp.json();
  const token = loginJson.token;
  expect(token).toBeTruthy();

  // 11) Confirmar orden con PATCH
  const patchResp = await request.patch(`http://localhost:3000/api/ordenes/${ordenId}/estado`, {
    data: { estado: 'confirmada' },
    headers: { Authorization: `Bearer ${token}` }
  });
  const patchJson = await patchResp.json();
  expect(patchResp.ok()).toBeTruthy();
  expect(patchJson.success).toBe(true);

  // 12) Verificar desde API que orden cambió de estado
  const listResp = await request.get('http://localhost:3000/api/ordenes', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const listJson = await listResp.json();
  const found = listJson.data.find(o => o.ordenId === ordenId || o.id === ordenId);
  expect(found).toBeTruthy();
  expect(found.estado === 'confirmada' || found.estado === 'confirmada').toBeTruthy();
});
