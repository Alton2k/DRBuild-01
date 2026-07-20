"use strict";

const tableName = "password_rate_limits";
const uniqueIndexName = "password_rate_limits_scope_identifier_uq";
const expiryIndexName = "password_rate_limits_expires_at_idx";

module.exports = {
  async up(knex) {
    if (await knex.schema.hasTable(tableName)) return;

    await knex.schema.createTable(tableName, (table) => {
      table.increments("id").primary();
      table.string("scope", 16).notNullable();
      table.string("identifier_hash", 64).notNullable();
      table.integer("attempts").notNullable().defaultTo(0);
      table.datetime("window_started_at", { useTz: true }).notNullable();
      table.datetime("locked_until", { useTz: true }).nullable();
      table.datetime("expires_at", { useTz: true }).notNullable();
      table.datetime("created_at", { useTz: true }).notNullable();
      table.datetime("updated_at", { useTz: true }).notNullable();
      table.unique(["scope", "identifier_hash"], uniqueIndexName);
      table.index(["expires_at"], expiryIndexName);
    });
  },

  async down(knex) {
    if (await knex.schema.hasTable(tableName)) {
      await knex.schema.dropTable(tableName);
    }
  },
};
