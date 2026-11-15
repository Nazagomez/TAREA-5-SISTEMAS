"use strict";

const createEnqueueHandler = require("../lib/enqueue-handler");
const { METHOD_INSERT, RESOURCE_PUBLISHER } = require("../lib/queue-message");

/** Appends a publisher insert to the Redis list bookstore. */
exports.handler = createEnqueueHandler({
  httpMethod: "POST",
  method: METHOD_INSERT,
  resource: RESOURCE_PUBLISHER,
  readsBody: true
});
