"use strict";

const { ownsMessage } = require("./queue-message");

const LIST_NAME = "bookstore";
const REMOVE_ONE = 1;

/**
 * Appends one update to the bookstore list. Redis creates the list on the first push.
 * @param {{ rPush: Function }} client
 * @param {string} message
 * @returns {Promise<void>}
 */
async function appendUpdate(client, message) {
  await client.rPush(LIST_NAME, message);
}

/**
 * Walks the bookstore list, applies updates owned by one resource, and removes those entries.
 * Updates for other resources stay in the list for their own tasks function.
 * @param {{ lRange: Function, lRem: Function }} client
 * @param {string} owner
 * @param {(request: Record<string, unknown>) => Promise<void>} dispatch
 * @returns {Promise<number>}
 */
async function consumeList(client, owner, dispatch) {
  const updates = await client.lRange(LIST_NAME, 0, -1);
  const failures = [];
  let processed = 0;
  for (const raw of updates) {
    const outcome = await applyOwnedUpdate(client, owner, dispatch, raw);
    processed += outcome.processed;
    if (outcome.failure) failures.push(outcome.failure);
  }
  if (failures.length > 0) {
    throw new Error(failures.join("; "));
  }
  return processed;
}

/**
 * @param {{ lRem: Function }} client
 * @param {string} owner
 * @param {(request: Record<string, unknown>) => Promise<void>} dispatch
 * @param {string} raw
 * @returns {Promise<{ processed: number, failure: string | null }>}
 */
async function applyOwnedUpdate(client, owner, dispatch, raw) {
  let request = null;
  try {
    request = JSON.parse(raw);
  } catch (error) {
    return { processed: 0, failure: error.message };
  }
  if (!ownsMessage(request, owner)) {
    return { processed: 0, failure: null };
  }
  try {
    await dispatch(request);
    await client.lRem(LIST_NAME, REMOVE_ONE, raw);
    return { processed: 1, failure: null };
  } catch (error) {
    return { processed: 0, failure: error.message };
  }
}

module.exports = {
  LIST_NAME,
  appendUpdate,
  consumeList
};
