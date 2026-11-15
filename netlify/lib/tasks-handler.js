"use strict";

const withRedis = require("./redis-client");
const { consumeList } = require("./redis-list");
const dispatchUpdate = require("./dispatch-update");
const { optionsResponse, okResponse, failResponse } = require("./http");

const ALLOWED_METHODS = ["GET", "POST"];

/**
 * Builds the function that walks bookstore and applies one resource.
 * @param {string} resource
 * @returns {(event: { httpMethod?: string }) => Promise<{ statusCode: number, headers: Record<string, string>, body: string }>}
 */
function createTasksHandler(resource) {
  return async function handleTasks(event) {
    if (event.httpMethod === "OPTIONS") return optionsResponse();
    try {
      if (!ALLOWED_METHODS.includes(event.httpMethod)) {
        throw new Error("GET or POST is required");
      }
      const processed = await withRedis((client) => consumeList(client, resource, (request) => dispatchUpdate(resource, request)));
      console.log("Processed " + processed + " " + resource + " updates");
      return okResponse();
    } catch (error) {
      return failResponse(error);
    }
  };
}

module.exports = createTasksHandler;
