"use strict";

const createEnqueueHandler = require("../lib/enqueue-handler");
const { METHOD_DELETE, RESOURCE_AUTHOR } = require("../lib/queue-message");

/** Appends an author delete to the Redis list bookstore. */
exports.handler = createEnqueueHandler({
  httpMethod: "DELETE",
  method: METHOD_DELETE,
  resource: RESOURCE_AUTHOR,
  requiresId: true
});
