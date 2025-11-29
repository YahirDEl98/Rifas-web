/**
 * Migración: Eliminar columna `email_cliente` de la tabla `ordenes`
 * - Para clientes distintos de SQLite usa `dropColumn`.
 * - Para SQLite recrea la tabla sin la columna (forma segura que preserva datos).
 *
 * IMPORTANTE: Probar esta migración primero en una copia de la BD antes
 * de ejecutarla en producción. Esta migración modifica la estructura
 * y copia los datos; aunque intenta ser segura, siempre haga respaldo.
 */

exports.up = async function(knex) {
  const exists = await knex.schema.hasColumn('ordenes', 'email_cliente');
  if (!exists) return;

  const client = knex.client.config.client;

  if (client === 'sqlite3') {
    await knex.transaction(async trx => {
      await trx.schema.renameTable('ordenes', 'ordenes_old');

      await trx.schema.createTable('ordenes', table => {
        table.increments('id').primary();
        table.string('numero_orden', 50).unique().notNullable();
        table.integer('cantidad_boletos').notNullable();
        table.decimal('precio_unitario', 10, 2).notNullable();
        table.decimal('subtotal', 10, 2).notNullable();
        table.decimal('descuento', 10, 2).notNullable().defaultTo(0);
        table.decimal('total', 10, 2).notNullable();
        table.string('nombre_cliente', 255).notNullable();
        table.string('telefono_cliente', 20).notNullable();
        table.string('metodo_pago', 50);
        table.text('detalles_pago');
        table.string('estado', 50).notNullable().defaultTo('pendiente');
        table.json('boletos');
        table.text('notas');
        table.string('comprobante_path', 255);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.index('numero_orden');
        table.index('telefono_cliente');
        table.index('estado');
        table.index('created_at');
      });

      const cols = [
        'id','numero_orden','cantidad_boletos','precio_unitario','subtotal','descuento','total',
        'nombre_cliente','telefono_cliente','metodo_pago','detalles_pago','estado','boletos','notas','comprobante_path','created_at','updated_at'
      ];
      const colsList = cols.map(c => `"${c}"`).join(', ');

      await trx.raw(`INSERT INTO ordenes (${colsList}) SELECT ${colsList} FROM ordenes_old;`);
      await trx.schema.dropTableIfExists('ordenes_old');
    });
  } else {
    await knex.schema.table('ordenes', table => {
      table.dropColumn('email_cliente');
    });
  }
};

exports.down = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'sqlite3') {
    await knex.transaction(async trx => {
      await trx.schema.renameTable('ordenes', 'ordenes_new');

      await trx.schema.createTable('ordenes', table => {
        table.increments('id').primary();
        table.string('numero_orden', 50).unique().notNullable();
        table.integer('cantidad_boletos').notNullable();
        table.decimal('precio_unitario', 10, 2).notNullable();
        table.decimal('subtotal', 10, 2).notNullable();
        table.decimal('descuento', 10, 2).notNullable().defaultTo(0);
        table.decimal('total', 10, 2).notNullable();
        table.string('nombre_cliente', 255).notNullable();
        table.string('email_cliente', 255);
        table.string('telefono_cliente', 20).notNullable();
        table.string('metodo_pago', 50);
        table.text('detalles_pago');
        table.string('estado', 50).notNullable().defaultTo('pendiente');
        table.json('boletos');
        table.text('notas');
        table.string('comprobante_path', 255);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.index('numero_orden');
        table.index('telefono_cliente');
        table.index('estado');
        table.index('created_at');
      });

      const colsOld = [
        'id','numero_orden','cantidad_boletos','precio_unitario','subtotal','descuento','total',
        'nombre_cliente','telefono_cliente','metodo_pago','detalles_pago','estado','boletos','notas','comprobante_path','created_at','updated_at'
      ];

      const colsNew = colsOld.concat(['email_cliente']);
      const colsOldList = colsOld.map(c => `"${c}"`).join(', ');
      const colsNewList = colsNew.map(c => `"${c}"`).join(', ');

      await trx.raw(`INSERT INTO ordenes (${colsNewList}) SELECT ${colsOldList}, NULL FROM ordenes_new;`);
      await trx.schema.dropTableIfExists('ordenes_new');
    });
  } else {
    await knex.schema.table('ordenes', table => {
      table.string('email_cliente', 255);
    });
  }
};
