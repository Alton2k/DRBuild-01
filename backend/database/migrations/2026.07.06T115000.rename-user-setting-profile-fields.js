"use strict";

const userSettingsTable = "user_settings";

async function renameOrCopyColumn(knex, oldColumnName, newColumnName, columnBuilder) {
  const hasOldColumn = await knex.schema.hasColumn(userSettingsTable, oldColumnName);
  const hasNewColumn = await knex.schema.hasColumn(userSettingsTable, newColumnName);

  if (hasOldColumn && !hasNewColumn) {
    await knex.schema.alterTable(userSettingsTable, (table) => {
      table.renameColumn(oldColumnName, newColumnName);
    });
    return;
  }

  if (!hasOldColumn && !hasNewColumn) {
    await knex.schema.alterTable(userSettingsTable, (table) => {
      columnBuilder(table, newColumnName);
    });
    return;
  }

  if (hasOldColumn && hasNewColumn) {
    await knex(userSettingsTable)
      .whereNull(newColumnName)
      .whereNotNull(oldColumnName)
      .update({ [newColumnName]: knex.ref(oldColumnName) });
  }
}

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable(userSettingsTable))) {
      return;
    }

    await renameOrCopyColumn(knex, "profile_avatar_url", "avatar_url", (table, columnName) => {
      table.text(columnName);
    });
    await renameOrCopyColumn(knex, "profile_display_name", "display_name", (table, columnName) => {
      table.string(columnName, 48);
    });
    await renameOrCopyColumn(knex, "profile_user_name", "username", (table, columnName) => {
      table.string(columnName, 24);
    });
    await renameOrCopyColumn(knex, "profile_bio", "bio", (table, columnName) => {
      table.text(columnName);
    });
  },

  async down(knex) {
    if (!(await knex.schema.hasTable(userSettingsTable))) {
      return;
    }

    if ((await knex.schema.hasColumn(userSettingsTable, "display_name")) && !(await knex.schema.hasColumn(userSettingsTable, "profile_display_name"))) {
      await knex.schema.alterTable(userSettingsTable, (table) => {
        table.renameColumn("display_name", "profile_display_name");
      });
    }

    if ((await knex.schema.hasColumn(userSettingsTable, "username")) && !(await knex.schema.hasColumn(userSettingsTable, "profile_user_name"))) {
      await knex.schema.alterTable(userSettingsTable, (table) => {
        table.renameColumn("username", "profile_user_name");
      });
    }

    if ((await knex.schema.hasColumn(userSettingsTable, "avatar_url")) && !(await knex.schema.hasColumn(userSettingsTable, "profile_avatar_url"))) {
      await knex.schema.alterTable(userSettingsTable, (table) => {
        table.renameColumn("avatar_url", "profile_avatar_url");
      });
    }

    if ((await knex.schema.hasColumn(userSettingsTable, "bio")) && !(await knex.schema.hasColumn(userSettingsTable, "profile_bio"))) {
      await knex.schema.alterTable(userSettingsTable, (table) => {
        table.renameColumn("bio", "profile_bio");
      });
    }
  },
};
