/**
 * Migración: Crear tabla admin_users
 * Almacena credenciales de administrador para acceso seguro al panel
 */

exports.up = function(knex) {
  return knex.schema.createTable('admin_users', table => {
    table.increments('id').primary();
    table.string('username', 100).unique().notNullable();
    table.string('password_hash', 255).notNullable(); // Usar bcrypt
    table.string('email', 255).notNullable();
    table.boolean('activo').notNullable().defaultTo(true);
    table.timestamp('ultimo_acceso');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('username');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('admin_users');
};
