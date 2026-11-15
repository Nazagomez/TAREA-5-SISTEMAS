"use strict";

const createTasksHandler = require("../lib/tasks-handler");
const { RESOURCE_AUTHOR } = require("../lib/queue-message");

exports.handler = createTasksHandler(RESOURCE_AUTHOR);
