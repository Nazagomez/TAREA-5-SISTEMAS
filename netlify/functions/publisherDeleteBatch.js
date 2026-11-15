"use strict";

const db = require("../lib/db");
const { createBatchHandler, applyDelete } = require("../lib/batch-handler");

exports.handler = createBatchHandler({
  httpMethod: "DELETE",
  apply: applyDelete(db.deletePublisher)
});
