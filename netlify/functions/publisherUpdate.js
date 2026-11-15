"use strict";

const createEnqueueHandler = require("../lib/enqueue-handler");
const { METHOD_UPDATE, RESOURCE_PUBLISHER } = require("../lib/queue-message");

/** Appends a publisher update to the Redis list bookstore. */
exports.handler = createEnqueueHandler({
  httpMethod: "PUT",
  method: METHOD_UPDATE,
  resource: RESOURCE_PUBLISHER,
  requiresId: true,
  readsBody: true
});
