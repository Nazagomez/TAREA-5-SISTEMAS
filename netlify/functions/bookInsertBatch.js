"use strict";

const db = require("../lib/db");
const { createBatchHandler, applyInsert } = require("../lib/batch-handler");

exports.handler = createBatchHandler({
  httpMethod: "POST",
  apply: applyInsert(db.insertBook)
});
