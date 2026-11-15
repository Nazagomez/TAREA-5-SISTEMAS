"use strict";

const createEnqueueHandler = require("../lib/enqueue-handler");
const { METHOD_INSERT } = require("../lib/queue-message");

/** Appends a book insert to the Redis list bookstore. */
exports.handler = createEnqueueHandler({
  httpMethod: "POST",
  method: METHOD_INSERT,
  readsBody: true
});
