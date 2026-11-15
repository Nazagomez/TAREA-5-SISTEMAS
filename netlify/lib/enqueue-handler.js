"use strict";

const withRedis = require("./redis-client");
const { appendUpdate } = require("./redis-list");
const { createQueueMessage, METHOD_DELETE, RESOURCE_BOOK } = require("./queue-message");
const { normalizeBook, normalizeAuthor, normalizePublisher } = require("./records");
const { assertMethod, readJsonBody, readPathId, optionsResponse, okResponse, failResponse } = require("./http");

const NORMALIZERS = {
  book: normalizeBook,
  author: normalizeAuthor,
  publisher: normalizePublisher
};

/**
 * @param {{ resource?: string, method: string, requiresId?: boolean, readsBody?: boolean, httpMethod: string }} options
 * @returns {(event: { httpMethod?: string, path?: string, body?: string }) => Promise<{ statusCode: number, headers: Record<string, string>, body: string }>}
 */
function createEnqueueHandler(options) {
  return async function handleEnqueue(event) {
    if (event.httpMethod === "OPTIONS") return optionsResponse();
    try {
      assertMethod(event, options.httpMethod);
      const payload = buildPayload(options, event);
      const message = createQueueMessage(payload);
      await withRedis((client) => appendUpdate(client, message));
      return okResponse();
    } catch (error) {
      return failResponse(error);
    }
  };
}

/**
 * @param {{ resource?: string, method: string, requiresId?: boolean, readsBody?: boolean }} options
 * @param {{ path?: string, body?: string }} event
 * @returns {{ resource?: string, method: string, id?: number, body?: Record<string, unknown> }}
 */
function buildPayload(options, event) {
  const payload = { method: options.method };
  if (options.resource) payload.resource = options.resource;
  if (options.requiresId) payload.id = readPathId(event);
  if (options.readsBody) payload.body = readJsonBody(event);
  if (options.method !== METHOD_DELETE) {
    validateBody(options.resource || RESOURCE_BOOK, payload.body || {});
  }
  return payload;
}

/**
 * Rejects an update before it is written to Redis.
 * @param {string} resource
 * @param {Record<string, unknown>} body
 * @returns {void}
 */
function validateBody(resource, body) {
  const normalize = NORMALIZERS[resource];
  if (!normalize) throw new Error("Unsupported resource");
  normalize(body, "0");
}

module.exports = createEnqueueHandler;
