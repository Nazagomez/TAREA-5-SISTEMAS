"use strict";

const { assertMethod, readOptionalId, optionsResponse, jsonResponse, failResponse } = require("./http");

/**
 * @param {{ functionName: string, listRecords: () => Promise<unknown>, findRecord: (id: string) => Promise<unknown>, missingMessage: string }} options
 * @returns {(event: { httpMethod?: string, path?: string }) => Promise<{ statusCode: number, headers: Record<string, string>, body: string }>}
 */
function createReadHandler(options) {
  return async function handleRead(event) {
    if (event.httpMethod === "OPTIONS") return optionsResponse();
    try {
      assertMethod(event, "GET");
      const id = readOptionalId(event, options.functionName);
      if (!id) return jsonResponse(await options.listRecords());
      const record = await options.findRecord(id);
      if (!record) return jsonResponse({ message: options.missingMessage }, 404);
      return jsonResponse(record);
    } catch (error) {
      return failResponse(error);
    }
  };
}

module.exports = createReadHandler;
