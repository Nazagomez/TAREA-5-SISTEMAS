"use strict";

const { METHOD_DELETE, METHOD_UPDATE, METHOD_INSERT } = require("./queue-message");
const { callBatch, functionsBaseUrl } = require("./http");

/**
 * @param {string} resource
 * @param {{ method?: string, id?: number, body?: Record<string, unknown> }} request
 * @returns {{ path: string, method: string, body?: Record<string, unknown> }}
 */
function resolveBatchCall(resource, request) {
  const prefix = resource === "book" ? "book" : resource;
  if (request.method === METHOD_DELETE) {
    return { path: prefix + "DeleteBatch/" + request.id, method: "DELETE" };
  }
  if (request.method === METHOD_UPDATE) {
    return { path: prefix + "UpdateBatch/" + request.id, method: "PUT", body: request.body };
  }
  if (request.method === METHOD_INSERT) {
    return { path: prefix + "InsertBatch", method: "POST", body: request.body };
  }
  throw new Error("Unsupported " + resource + " method");
}

/**
 * Invokes the batch function that writes one queued update.
 * @param {string} resource
 * @param {{ method?: string, id?: number, body?: Record<string, unknown> }} request
 * @returns {Promise<void>}
 */
async function dispatchUpdate(resource, request) {
  const target = resolveBatchCall(resource, request);
  await callBatch(functionsBaseUrl() + target.path, {
    method: target.method,
    body: target.body === undefined ? undefined : JSON.stringify(target.body)
  });
}

module.exports = dispatchUpdate;
