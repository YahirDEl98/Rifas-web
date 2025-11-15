/**
 * Seed: Usuarios admin iniciales
 * Crea un usuario admin por defecto para desarrollo
 * Contraseña: admin (CAMBIAR EN PRODUCCIÓN)
 */

const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Elimina registros existentes (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    await knex('admin_users').del();
  }

  // Inserta admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await knex('admin_users').insert({
    username: 'admin',
    password_hash: hashedPassword,
    email: 'admin@rifaplus.local',
    activo: true
  });
};
