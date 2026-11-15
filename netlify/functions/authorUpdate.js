"use strict";

const createEnqueueHandler = require("../lib/enqueue-handler");
const { METHOD_UPDATE, RESOURCE_AUTHOR } = require("../lib/queue-message");

/** Appends an author update to the Redis list bookstore. */
exports.handler = createEnqueueHandler({
  httpMethod: "PUT",
  method: METHOD_UPDATE,
  resource: RESOURCE_AUTHOR,
  requiresId: true,
  readsBody: true
});
