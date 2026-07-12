"use strict";

const userSettingsTable = "user_settings";
const usersTable = "up_users";

async function addColumnIfMissing(knex, tableName, columnName, addColumn) {
  if (await knex.schema.hasColumn(tableName, columnName)) {
    return;
  }

  await knex.schema.alterTable(tableName, (table) => {
    addColumn(table, columnName);
  });
}

async function dropColumnIfExists(knex, tableName, columnName) {
  if (!(await knex.schema.hasColumn(tableName, columnName))) {
    return;
  }

  await knex.schema.alterTable(tableName, (table) => {
    table.dropColumn(columnName);
  });
}

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable(userSettingsTable))) {
      return;
    }

    await addColumnIfMissing(knex, userSettingsTable, "owner_username", (table, columnName) => {
      table.string(columnName, 120);
    });

    await addColumnIfMissing(knex, userSettingsTable, "owner_email", (table, columnName) => {
      table.string(columnName, 255);
    });

    if (!(await knex.schema.hasTable(usersTable))) {
      return;
    }

    const users = await knex(usersTable).select("id", "username", "email");

    for (const user of users) {
      await knex(userSettingsTable)
        .where({ user_id: String(user.id) })
        .update({
          owner_username: user.username || null,
          owner_email: user.email || null,
        });
    }
  },

  async down(knex) {
    if (!(await knex.schema.hasTable(userSettingsTable))) {
      return;
    }

    await dropColumnIfExists(knex, userSettingsTable, "owner_email");
    await dropColumnIfExists(knex, userSettingsTable, "owner_username");
  },
};
