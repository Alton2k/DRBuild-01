"use strict";

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable("comments")) || (await knex.schema.hasColumn("comments", "report_count"))) {
      return;
    }

    await knex.schema.alterTable("comments", (table) => {
      table.integer("report_count").notNullable().defaultTo(0);
    });
  },

  async down(knex) {
    if (!(await knex.schema.hasTable("comments")) || !(await knex.schema.hasColumn("comments", "report_count"))) {
      return;
    }

    await knex.schema.alterTable("comments", (table) => {
      table.dropColumn("report_count");
    });
  },
};
