"use strict";

/** @type {Map<string, string[]>} */
const lists = new Map();

/**
 * Drops every in-memory list. Tests use this between cases.
 * @returns {void}
 */
function resetMemoryList() {
  lists.clear();
}

/**
 * In-memory stand-in for the Redis list commands used by the app.
 * @returns {{ rPush: Function, lRange: Function, lRem: Function }}
 */
function createMemoryClient() {
  return {
    /**
     * @param {string} key
     * @param {string} value
     * @returns {Promise<number>}
     */
    async rPush(key, value) {
      const list = lists.get(key) || [];
      list.push(String(value));
      lists.set(key, list);
      return list.length;
    },
    /**
     * @param {string} key
     * @param {number} start
     * @param {number} stop
     * @returns {Promise<string[]>}
     */
    async lRange(key, start, stop) {
      const list = lists.get(key) || [];
      const end = stop < 0 ? list.length + stop : stop;
      return list.slice(start, end + 1);
    },
    /**
     * Removes the first `count` values equal to `value`, from head to tail.
     * @param {string} key
     * @param {number} count
     * @param {string} value
     * @returns {Promise<number>}
     */
    async lRem(key, count, value) {
      const list = lists.get(key) || [];
      const next = [];
      let removed = 0;
      for (const item of list) {
        if (removed < count && item === value) {
          removed += 1;
          continue;
        }
        next.push(item);
      }
      lists.set(key, next);
      return removed;
    }
  };
}

const memoryClient = createMemoryClient();

module.exports = {
  resetMemoryList,
  memoryClient
};
