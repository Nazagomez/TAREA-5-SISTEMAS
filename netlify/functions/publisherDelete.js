"use strict";

const createEnqueueHandler = require("../lib/enqueue-handler");
const { METHOD_DELETE, RESOURCE_PUBLISHER } = require("../lib/queue-message");

/** Appends a publisher delete to the Redis list bookstore. */
exports.handler = createEnqueueHandler({
  httpMethod: "DELETE",
  method: METHOD_DELETE,
  resource: RESOURCE_PUBLISHER,
  requiresId: true
});
