"use strict";

const db = require("./db");
const { assertMethod, readJsonBody, readPathId, optionsResponse, okResponse, failResponse } = require("./http");

/**
 * @param {{ httpMethod: string, apply: (event: { path?: string, body?: string }) => Promise<void> }} options
 * @returns {(event: { httpMethod?: string, path?: string, body?: string }) => Promise<{ statusCode: number, headers: Record<string, string>, body: string }>}
 */
function createBatchHandler(options) {
  return async function handleBatch(event) {
    if (event.httpMethod === "OPTIONS") return optionsResponse();
    try {
      assertMethod(event, options.httpMethod);
      await options.apply(event);
      return okResponse();
    } catch (error) {
      return failResponse(error);
    }
  };
}

/**
 * @param {(body: Record<string, unknown>) => Promise<unknown>} insertRecord
 * @returns {(event: { body?: string }) => Promise<void>}
 */
function applyInsert(insertRecord) {
  return async function insertFromEvent(event) {
    await insertRecord(readJsonBody(event));
  };
}

/**
 * @param {(id: number, body: Record<string, unknown>) => Promise<unknown>} updateRecord
 * @returns {(event: { path?: string, body?: string }) => Promise<void>}
 */
function applyUpdate(updateRecord) {
  return async function updateFromEvent(event) {
    await updateRecord(readPathId(event), readJsonBody(event));
  };
}

/**
 * @param {(id: number) => Promise<unknown>} deleteRecord
 * @returns {(event: { path?: string }) => Promise<void>}
 */
function applyDelete(deleteRecord) {
  return async function deleteFromEvent(event) {
    await deleteRecord(readPathId(event));
  };
}

module.exports = {
  createBatchHandler,
  applyInsert,
  applyUpdate,
  applyDelete
};
