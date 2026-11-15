"use strict";

const { createClient } = require("redis");
const { memoryClient } = require("./memory-list");

const LOCAL_HOSTS = ["127.0.0.1", "localhost"];

/**
 * @returns {boolean}
 */
function isMemoryMode() {
  return process.env.REDIS_MEMORY === "true";
}

/**
 * @returns {{ username: string, password: string, socket: { host: string, port: number, tls: boolean } }}
 */
function readRedisOptions() {
  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT);
  const username = process.env.REDIS_USERNAME;
  const password = process.env.REDIS_PASSWORD;
  if (!host || !Number.isInteger(port) || !username || !password) {
    throw new Error("REDIS_HOST, REDIS_PORT, REDIS_USERNAME and REDIS_PASSWORD are required");
  }
  const tlsDisabled = process.env.REDIS_TLS === "false";
  const isLocalHost = LOCAL_HOSTS.includes(host);
  return {
    username,
    password,
    socket: {
      host,
      port,
      tls: !tlsDisabled && !isLocalHost
    }
  };
}

/**
 * Runs list work and closes the Redis connection afterwards.
 * @param {(client: { rPush: Function, lRange: Function, lRem: Function }) => Promise<unknown>} task
 * @returns {Promise<unknown>}
 */
async function withRedis(task) {
  if (isMemoryMode()) {
    return task(memoryClient);
  }
  const client = createClient(readRedisOptions());
  client.on("error", (error) => {
    console.log(error.message);
  });
  await client.connect();
  try {
    return await task(client);
  } finally {
    if (client.isOpen) {
      await client.quit();
    }
  }
}

module.exports = withRedis;
