"use strict";

const db = require("../lib/db");
const { createBatchHandler, applyUpdate } = require("../lib/batch-handler");

exports.handler = createBatchHandler({
  httpMethod: "PUT",
  apply: applyUpdate(db.updatePublisher)
});
