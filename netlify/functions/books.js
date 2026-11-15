"use strict";

const db = require("../lib/db");
const createReadHandler = require("../lib/read-handler");

exports.handler = createReadHandler({
  functionName: "books",
  listRecords: db.listBooks,
  findRecord: db.findBook,
  missingMessage: "Book not found"
});
