"use strict";

const createEnqueueHandler = require("../lib/enqueue-handler");
const { METHOD_UPDATE } = require("../lib/queue-message");

/** Appends a book update to the Redis list bookstore. */
exports.handler = createEnqueueHandler({
  httpMethod: "PUT",
  method: METHOD_UPDATE,
  requiresId: true,
  readsBody: true
});
