/**
 * Migración: Crear tabla ordenes
 * Almacena todas las órdenes de rifas con detalles de boletos y totales
 */

exports.up = function(knex) {
  return knex.schema.createTable('ordenes', table => {
    table.increments('id').primary();
    table.string('numero_orden', 50).unique().notNullable(); // Ej: "ORD-001"
    table.integer('cantidad_boletos').notNullable();
    table.decimal('precio_unitario', 10, 2).notNullable();
    table.decimal('subtotal', 10, 2).notNullable();
    table.decimal('descuento', 10, 2).notNullable().defaultTo(0);
    table.decimal('total', 10, 2).notNullable();
    table.string('nombre_cliente', 255).notNullable();
    table.string('email_cliente', 255).notNullable();
    table.string('telefono_cliente', 20).notNullable();
    table.string('metodo_pago', 50); // 'transferencia', 'efectivo', 'tarjeta', etc.
    table.text('detalles_pago'); // Número de transferencia, referencia, etc.
    table.string('estado', 50).notNullable().defaultTo('pendiente'); // 'pendiente', 'confirmada', 'cancelada'
    table.json('boletos'); // Array de números de boletos asignados
    table.text('notas');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices para búsquedas rápidas
    table.index('numero_orden');
    table.index('email_cliente');
    table.index('estado');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('ordenes');
};
