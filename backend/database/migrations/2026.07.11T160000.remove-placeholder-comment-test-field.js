"use strict";

const commentsTable = "comments";
const archiveTable = "comment_test_field_archive";

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable(commentsTable)) || !(await knex.schema.hasColumn(commentsTable, "test"))) {
      return;
    }

    if (!(await knex.schema.hasTable(archiveTable))) {
      await knex.schema.createTable(archiveTable, (table) => {
        table.increments("id").primary();
        table.integer("comment_id").notNullable();
        table.string("document_id", 255);
        table.text("value").notNullable();
        table.datetime("archived_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.unique(["comment_id"], "comment_test_field_archive_comment_uq");
      });
    }

    const populatedRows = await knex(commentsTable)
      .select("id", "document_id", "test")
      .whereNotNull("test")
      .whereRaw("TRIM(test) <> ''");

    for (const row of populatedRows) {
      await knex(archiveTable)
        .insert({ comment_id: row.id, document_id: row.document_id, value: row.test })
        .onConflict("comment_id")
        .merge({ document_id: row.document_id, value: row.test, archived_at: knex.fn.now() });
    }

    await knex.schema.alterTable(commentsTable, (table) => table.dropColumn("test"));
  },

  async down(knex) {
    if (!(await knex.schema.hasTable(commentsTable))) return;
    if (!(await knex.schema.hasColumn(commentsTable, "test"))) {
      await knex.schema.alterTable(commentsTable, (table) => table.text("test"));
    }
    if (!(await knex.schema.hasTable(archiveTable))) return;

    const archivedRows = await knex(archiveTable).select("comment_id", "value");
    for (const row of archivedRows) {
      await knex(commentsTable).where({ id: row.comment_id }).update({ test: row.value });
    }
    await knex.schema.dropTable(archiveTable);
  },
};
