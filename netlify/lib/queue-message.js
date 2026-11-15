"use strict";

const RESOURCE_BOOK = "book";
const RESOURCE_AUTHOR = "author";
const RESOURCE_PUBLISHER = "publisher";
const METHOD_UPDATE = "UPDATE";
const METHOD_INSERT = "INSERT";
const METHOD_DELETE = "DELETE";

/**
 * Builds a JSON update with double quotes so Redis Insight can show it.
 * Book updates omit resource, matching the original book functions.
 * @param {{ resource?: string, method: string, id?: number, body?: Record<string, unknown> }} payload
 * @returns {string}
 */
function createQueueMessage(payload) {
  const message = {};
  if (payload.resource) {
    message.resource = payload.resource;
  }
  message.method = payload.method;
  if (payload.id !== undefined && payload.id !== null) {
    message.id = payload.id;
  }
  if (payload.body !== undefined) {
    message.body = payload.body;
  }
  return JSON.stringify(message);
}

/**
 * Book updates omit resource. Author and publisher updates set it.
 * @param {{ resource?: string }} request
 * @param {string} owner
 * @returns {boolean}
 */
function ownsMessage(request, owner) {
  const resource = request.resource || RESOURCE_BOOK;
  return resource === owner;
}

module.exports = {
  RESOURCE_BOOK,
  RESOURCE_AUTHOR,
  RESOURCE_PUBLISHER,
  METHOD_UPDATE,
  METHOD_INSERT,
  METHOD_DELETE,
  createQueueMessage,
  ownsMessage
};
