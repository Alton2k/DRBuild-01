"use strict";

const dealReportsTable = "deal_reports";
const dealsTable = "deals";
const dealReportLinksTable = "deal_reports_deal_lnk";
const uniqueIndexName = "deal_reports_deal_document_viewer_uq";

async function hasIndex(knex, tableName, indexName) {
  if (typeof knex.schema.hasIndex === "function") {
    return knex.schema.hasIndex(tableName, indexName);
  }

  const client = knex.client.config.client;

  if (["sqlite", "sqlite3", "better-sqlite3"].includes(client)) {
    const rows = await knex.raw("PRAGMA index_list(??)", [tableName]);
    return (Array.isArray(rows) ? rows : rows.rows ?? []).some((row) => row.name === indexName);
  }

  return false;
}

async function backfillDealDocumentIds(knex) {
  const rows = await knex(dealReportsTable)
    .select(`${dealReportsTable}.id`, `${dealsTable}.document_id as dealDocumentId`)
    .join(dealReportLinksTable, `${dealReportLinksTable}.deal_report_id`, `${dealReportsTable}.id`)
    .join(dealsTable, `${dealsTable}.id`, `${dealReportLinksTable}.deal_id`)
    .whereNull(`${dealReportsTable}.deal_document_id`);

  for (const row of rows) {
    await knex(dealReportsTable)
      .where({ id: row.id })
      .update({ deal_document_id: row.dealDocumentId });
  }
}

async function removeDuplicateReports(knex) {
  const duplicateGroups = await knex(dealReportsTable)
    .select("deal_document_id", "viewer_id")
    .whereNotNull("deal_document_id")
    .groupBy("deal_document_id", "viewer_id")
    .havingRaw("COUNT(*) > 1");

  for (const group of duplicateGroups) {
    const reports = await knex(dealReportsTable)
      .select("id")
      .where({
        deal_document_id: group.deal_document_id,
        viewer_id: group.viewer_id,
      })
      .orderBy("created_at", "desc")
      .orderBy("id", "desc");

    const duplicateIds = reports.slice(1).map((report) => report.id);

    if (duplicateIds.length > 0) {
      await knex(dealReportsTable).whereIn("id", duplicateIds).delete();
    }
  }
}

async function resyncReportCounts(knex) {
  const counts = await knex(dealReportsTable)
    .select("deal_document_id")
    .count({ reportCount: "*" })
    .whereNotNull("deal_document_id")
    .groupBy("deal_document_id");

  await knex(dealsTable).update({ report_count: 0 });

  for (const row of counts) {
    await knex(dealsTable)
      .where({ document_id: row.deal_document_id })
      .update({ report_count: Number(row.reportCount ?? 0) });
  }
}

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable(dealReportsTable))) {
      return;
    }

    const hasDealDocumentId = await knex.schema.hasColumn(dealReportsTable, "deal_document_id");

    if (!hasDealDocumentId) {
      await knex.schema.alterTable(dealReportsTable, (table) => {
        table.string("deal_document_id");
      });
    }

    await backfillDealDocumentIds(knex);
    await removeDuplicateReports(knex);
    await resyncReportCounts(knex);

    if (!(await hasIndex(knex, dealReportsTable, uniqueIndexName))) {
      await knex.schema.alterTable(dealReportsTable, (table) => {
        table.unique(["deal_document_id", "viewer_id"], uniqueIndexName);
      });
    }
  },

  async down(knex) {
    if (!(await knex.schema.hasTable(dealReportsTable))) {
      return;
    }

    if (!(await hasIndex(knex, dealReportsTable, uniqueIndexName))) {
      return;
    }

    await knex.schema.alterTable(dealReportsTable, (table) => {
      table.dropUnique(["deal_document_id", "viewer_id"], uniqueIndexName);
    });
  },
};
