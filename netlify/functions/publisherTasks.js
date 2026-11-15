"use strict";

const createTasksHandler = require("../lib/tasks-handler");
const { RESOURCE_PUBLISHER } = require("../lib/queue-message");

exports.handler = createTasksHandler(RESOURCE_PUBLISHER);
