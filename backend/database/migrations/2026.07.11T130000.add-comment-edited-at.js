"use strict";

const tableName = "comments";
const columnName = "edited_at";

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable(tableName)) || (await knex.schema.hasColumn(tableName, columnName))) {
      return;
    }

    await knex.schema.alterTable(tableName, (table) => {
      table.datetime(columnName, { useTz: true }).nullable();
    });
  },

  async down(knex) {
    if (!(await knex.schema.hasTable(tableName)) || !(await knex.schema.hasColumn(tableName, columnName))) {
      return;
    }

    await knex.schema.alterTable(tableName, (table) => {
      table.dropColumn(columnName);
    });
  },
};
