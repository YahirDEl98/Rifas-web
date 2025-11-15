const { test, expect } = require('@playwright/test');

// Simple integration test: POST a valid orden and expect success
test('API: crear orden válida', async ({ request }) => {
  const ordenPayload = {
    ordenId: `E2E-API-${Date.now()}`,
    cliente: {
      nombre: 'Integration',
      apellidos: 'Test',
      whatsapp: '+524599111111',
      email: `integration+${Date.now()}@test.local`
    },
    cuenta: {
      id: 1,
      bank: 'Banco Mercantil',
      accountNumber: '0152-0000-0012345678-9',
      accountType: 'Corriente',
      beneficiary: 'Juan Carlos López García',
      phone: '+52 449 123 4567'
    },
    boletos: [101, 102],
    totales: {
      subtotal: 100,
      descuento: 0,
      totalFinal: 100
    },
    fecha: new Date().toISOString(),
    referencia: `E2E-API-${Date.now()}`
  };

  const resp = await request.post('http://localhost:3000/api/ordenes', { data: ordenPayload });
  expect(resp.ok()).toBeTruthy();
  const json = await resp.json();
  expect(json.success).toBe(true);
  expect(json.url).toBeTruthy();
});
