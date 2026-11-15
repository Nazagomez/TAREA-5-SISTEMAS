"use strict";

const createEnqueueHandler = require("../lib/enqueue-handler");
const { METHOD_INSERT, RESOURCE_AUTHOR } = require("../lib/queue-message");

/** Appends an author insert to the Redis list bookstore. */
exports.handler = createEnqueueHandler({
  httpMethod: "POST",
  method: METHOD_INSERT,
  resource: RESOURCE_AUTHOR,
  readsBody: true
});
