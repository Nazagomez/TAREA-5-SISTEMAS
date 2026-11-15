"use strict";

const createEnqueueHandler = require("../lib/enqueue-handler");
const { METHOD_DELETE } = require("../lib/queue-message");

/** Appends a book delete to the Redis list bookstore. */
exports.handler = createEnqueueHandler({
  httpMethod: "DELETE",
  method: METHOD_DELETE,
  requiresId: true
});
