"use strict";

const db = require("../lib/db");
const createReadHandler = require("../lib/read-handler");

exports.handler = createReadHandler({
  functionName: "publishers",
  listRecords: db.listPublishers,
  findRecord: db.findPublisher,
  missingMessage: "Publisher not found"
});
