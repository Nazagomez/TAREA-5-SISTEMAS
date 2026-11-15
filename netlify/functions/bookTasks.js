"use strict";

const createTasksHandler = require("../lib/tasks-handler");
const { RESOURCE_BOOK } = require("../lib/queue-message");

exports.handler = createTasksHandler(RESOURCE_BOOK);
