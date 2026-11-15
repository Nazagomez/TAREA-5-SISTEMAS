"use strict";

const db = require("../lib/db");
const createReadHandler = require("../lib/read-handler");

exports.handler = createReadHandler({
  functionName: "authors",
  listRecords: db.listAuthors,
  findRecord: db.findAuthor,
  missingMessage: "Author not found"
});
