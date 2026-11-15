"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { describe, it, beforeEach } = require("node:test");

process.env.USE_FILE_STORE = "true";
process.env.STORE_PATH = path.join(os.tmpdir(), "tarea5-bookstore-test.json");
process.env.REDIS_MEMORY = "true";
delete process.env.DATABASE_URL;
delete process.env.REDIS_HOST;
delete process.env.REDIS_PASSWORD;

const { createQueueMessage } = require("../netlify/lib/queue-message");
const { LIST_NAME, consumeList } = require("../netlify/lib/redis-list");
const { resetMemoryList, memoryClient } = require("../netlify/lib/memory-list");
const books = require("../netlify/functions/books");
const bookUpdate = require("../netlify/functions/bookUpdate");
const bookInsert = require("../netlify/functions/bookInsert");
const bookDelete = require("../netlify/functions/bookDelete");
const bookTasks = require("../netlify/functions/bookTasks");
const bookUpdateBatch = require("../netlify/functions/bookUpdateBatch");
const bookInsertBatch = require("../netlify/functions/bookInsertBatch");
const bookDeleteBatch = require("../netlify/functions/bookDeleteBatch");
const authors = require("../netlify/functions/authors");
const authorInsert = require("../netlify/functions/authorInsert");
const authorUpdate = require("../netlify/functions/authorUpdate");
const authorDelete = require("../netlify/functions/authorDelete");
const authorTasks = require("../netlify/functions/authorTasks");
const authorUpdateBatch = require("../netlify/functions/authorUpdateBatch");
const authorInsertBatch = require("../netlify/functions/authorInsertBatch");
const publishers = require("../netlify/functions/publishers");
const publisherInsert = require("../netlify/functions/publisherInsert");
const publisherTasks = require("../netlify/functions/publisherTasks");
const publisherInsertBatch = require("../netlify/functions/publisherInsertBatch");
const publisherDeleteBatch = require("../netlify/functions/publisherDeleteBatch");

const batchHandlers = {
  bookUpdateBatch: bookUpdateBatch.handler,
  bookInsertBatch: bookInsertBatch.handler,
  bookDeleteBatch: bookDeleteBatch.handler,
  authorUpdateBatch: authorUpdateBatch.handler,
  authorInsertBatch: authorInsertBatch.handler,
  authorDeleteBatch: require("../netlify/functions/authorDeleteBatch").handler,
  publisherInsertBatch: publisherInsertBatch.handler,
  publisherUpdateBatch: require("../netlify/functions/publisherUpdateBatch").handler,
  publisherDeleteBatch: publisherDeleteBatch.handler
};

const bookBody = {
  title: "Sistemas distribuidos",
  edition: "1st",
  copyright: 2026,
  language: "SPANISH",
  pages: 320,
  author: "Abraham Silberschatz",
  author_id: 1,
  publisher: "John Wiley & Sons",
  publisher_id: 1
};

/**
 * @returns {void}
 */
function resetStore() {
  if (fs.existsSync(process.env.STORE_PATH)) fs.unlinkSync(process.env.STORE_PATH);
}

/**
 * Routes batch calls to the local handlers, the same path bookTasks uses in Netlify.
 * @returns {void}
 */
function installLocalFetch() {
  global.fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/functions\/([A-Za-z0-9]+)(\/.*)?$/);
    const handler = match ? batchHandlers[match[1]] : null;
    if (!handler) {
      return { ok: false, text: async () => "Missing function" };
    }
    const result = await handler({ httpMethod: options.method, path: parsed.pathname, body: options.body });
    return { ok: result.statusCode >= 200 && result.statusCode < 300, text: async () => result.body || "" };
  };
}

/**
 * @param {string} functionName
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function readCollection(handler, functionName) {
  const response = await handler({ httpMethod: "GET", path: "/.netlify/functions/" + functionName });
  return JSON.parse(response.body);
}

describe("bookstore list messages", () => {
  beforeEach(() => {
    resetMemoryList();
  });

  it("serializes a book update with double quotes and no resource", () => {
    const raw = createQueueMessage({ method: "UPDATE", id: 1, body: { title: "Distributed Systems" } });
    assert.equal(raw.includes("'"), false);
    assert.deepEqual(JSON.parse(raw), { method: "UPDATE", id: 1, body: { title: "Distributed Systems" } });
  });

  it("keeps author and publisher updates in the list when book tasks run", async () => {
    await memoryClient.rPush(LIST_NAME, createQueueMessage({ method: "UPDATE", id: 1, body: { title: "New title" } }));
    await memoryClient.rPush(LIST_NAME, createQueueMessage({ resource: "author", method: "DELETE", id: 2 }));
    await memoryClient.rPush(LIST_NAME, createQueueMessage({ resource: "publisher", method: "INSERT", body: { publisher: "UNA" } }));
    const handled = [];
    const processed = await consumeList(memoryClient, "book", async (request) => {
      handled.push(request);
    });
    const remaining = await memoryClient.lRange(LIST_NAME, 0, -1);
    assert.equal(processed, 1);
    assert.equal(handled[0].id, 1);
    assert.equal(remaining.length, 2);
    assert.equal(JSON.parse(remaining[0]).resource, "author");
    assert.equal(JSON.parse(remaining[1]).resource, "publisher");
  });

  it("leaves a failed update in the list", async () => {
    await memoryClient.rPush(LIST_NAME, createQueueMessage({ method: "UPDATE", id: 4, body: { title: "Retry" } }));
    await assert.rejects(
      () => consumeList(memoryClient, "book", async () => {
        throw new Error("batch failed");
      }),
      /batch failed/
    );
    const remaining = await memoryClient.lRange(LIST_NAME, 0, -1);
    assert.equal(remaining.length, 1);
    assert.equal(JSON.parse(remaining[0]).id, 4);
  });
});

describe("book batch handlers", () => {
  beforeEach(() => {
    resetStore();
  });

  it("updates, inserts and deletes books in the store", async () => {
    const updateResponse = await bookUpdateBatch.handler({
      httpMethod: "PUT",
      path: "/.netlify/functions/bookUpdateBatch/1",
      body: JSON.stringify({ ...bookBody, title: "Operating Systems" })
    });
    assert.equal(updateResponse.statusCode, 200);
    const listed = await readCollection(books.handler, "books");
    assert.equal(listed.find((book) => book.id === "1").title, "Operating Systems");
    const insertResponse = await bookInsertBatch.handler({
      httpMethod: "POST",
      path: "/.netlify/functions/bookInsertBatch",
      body: JSON.stringify({ ...bookBody, title: "Distributed Systems", author: "New Author", author_id: 3, publisher: "UNA", publisher_id: 3 })
    });
    assert.equal(insertResponse.statusCode, 200);
    const afterInsert = await readCollection(books.handler, "books");
    assert.equal(afterInsert.some((book) => book.title === "Distributed Systems" && book.id === "5"), true);
    const deleteResponse = await bookDeleteBatch.handler({ httpMethod: "DELETE", path: "/.netlify/functions/bookDeleteBatch/5" });
    assert.equal(deleteResponse.statusCode, 200);
    const afterDelete = await readCollection(books.handler, "books");
    assert.equal(afterDelete.some((book) => book.id === "5"), false);
  });

  it("rejects a book update without a title", async () => {
    const response = await bookUpdateBatch.handler({
      httpMethod: "PUT",
      path: "/.netlify/functions/bookUpdateBatch/1",
      body: JSON.stringify({ title: " " })
    });
    assert.equal(response.statusCode, 422);
    assert.match(response.body, /title is required/);
  });
});

describe("author and publisher batch handlers", () => {
  beforeEach(() => {
    resetStore();
  });

  it("updates and inserts authors", async () => {
    const updateResponse = await authorUpdateBatch.handler({
      httpMethod: "PUT",
      path: "/.netlify/functions/authorUpdateBatch/1",
      body: JSON.stringify({ author: "A. Silberschatz", nationality: "American", birth_year: 1952, fields: "Databases", books: [{ book_id: 1, title: "Operating System Concepts" }] })
    });
    assert.equal(updateResponse.statusCode, 200);
    const author = JSON.parse((await authors.handler({ httpMethod: "GET", path: "/.netlify/functions/authors/1" })).body);
    assert.equal(author.author, "A. Silberschatz");
    assert.equal(author.books[0].title, "Operating System Concepts");
    const insertResponse = await authorInsertBatch.handler({
      httpMethod: "POST",
      path: "/.netlify/functions/authorInsertBatch",
      body: JSON.stringify({ author: "Leslie Lamport", nationality: "American", birth_year: 1941, fields: "Distributed systems", books: [] })
    });
    assert.equal(insertResponse.statusCode, 200);
    const listed = await readCollection(authors.handler, "authors");
    assert.equal(listed.some((item) => item.author === "Leslie Lamport"), true);
  });

  it("inserts and deletes publishers", async () => {
    const insertResponse = await publisherInsertBatch.handler({
      httpMethod: "POST",
      path: "/.netlify/functions/publisherInsertBatch",
      body: JSON.stringify({ publisher: "UNED Press", country: "Costa Rica", founded: 1977, genere: "Education", books: [] })
    });
    assert.equal(insertResponse.statusCode, 200);
    const listed = await readCollection(publishers.handler, "publishers");
    const created = listed.find((item) => item.publisher === "UNED Press");
    assert.ok(created);
    const deleteResponse = await publisherDeleteBatch.handler({ httpMethod: "DELETE", path: "/.netlify/functions/publisherDeleteBatch/" + created.id });
    assert.equal(deleteResponse.statusCode, 200);
    const afterDelete = await readCollection(publishers.handler, "publishers");
    assert.equal(afterDelete.some((item) => item.publisher === "UNED Press"), false);
  });
});

describe("redis list producers and tasks", () => {
  beforeEach(() => {
    resetStore();
    resetMemoryList();
    process.env.REDIS_MEMORY = "true";
    installLocalFetch();
  });

  it("stores book insert, update and delete in bookstore until bookTasks runs", async () => {
    const insertResponse = await bookInsert.handler({ httpMethod: "POST", path: "/.netlify/functions/bookInsert", body: JSON.stringify(bookBody) });
    const updateResponse = await bookUpdate.handler({ httpMethod: "PUT", path: "/.netlify/functions/bookUpdate/1", body: JSON.stringify({ ...bookBody, title: "Titulo en lista" }) });
    const deleteResponse = await bookDelete.handler({ httpMethod: "DELETE", path: "/.netlify/functions/bookDelete/2" });
    assert.equal(insertResponse.statusCode, 200);
    assert.equal(updateResponse.statusCode, 200);
    assert.equal(deleteResponse.statusCode, 200);
    const pending = await memoryClient.lRange(LIST_NAME, 0, -1);
    assert.deepEqual(pending.map((item) => JSON.parse(item).method), ["INSERT", "UPDATE", "DELETE"]);
    const beforeTasks = await readCollection(books.handler, "books");
    assert.equal(beforeTasks.find((book) => book.id === "1").title, "Operating System Concepts");
    assert.equal(beforeTasks.some((book) => book.title === "Sistemas distribuidos"), false);
    const tasksResponse = await bookTasks.handler({ httpMethod: "POST", path: "/.netlify/functions/bookTasks" });
    assert.equal(tasksResponse.statusCode, 200);
    const afterTasks = await readCollection(books.handler, "books");
    assert.equal(afterTasks.find((book) => book.id === "1").title, "Titulo en lista");
    assert.equal(afterTasks.some((book) => book.id === "2"), false);
    assert.equal(afterTasks.some((book) => book.title === "Sistemas distribuidos"), true);
    assert.deepEqual(await memoryClient.lRange(LIST_NAME, 0, -1), []);
  });

  it("does not write an invalid book update to the list", async () => {
    const response = await bookUpdate.handler({
      httpMethod: "PUT",
      path: "/.netlify/functions/bookUpdate/1",
      body: JSON.stringify({ title: " " })
    });
    assert.equal(response.statusCode, 422);
    assert.match(response.body, /title is required/);
    assert.deepEqual(await memoryClient.lRange(LIST_NAME, 0, -1), []);
  });

  it("applies only author updates when authorTasks runs", async () => {
    const authorResponse = await authorInsert.handler({
      httpMethod: "POST",
      path: "/.netlify/functions/authorInsert",
      body: JSON.stringify({ author: "Leslie Lamport", nationality: "American", birth_year: 1941, fields: "Distributed systems", books: [] })
    });
    const bookResponse = await bookUpdate.handler({
      httpMethod: "PUT",
      path: "/.netlify/functions/bookUpdate/1",
      body: JSON.stringify(bookBody)
    });
    assert.equal(authorResponse.statusCode, 200);
    assert.equal(bookResponse.statusCode, 200);
    const authorTaskResponse = await authorTasks.handler({ httpMethod: "GET", path: "/.netlify/functions/authorTasks" });
    assert.equal(authorTaskResponse.statusCode, 200);
    const listedAuthors = await readCollection(authors.handler, "authors");
    assert.equal(listedAuthors.some((item) => item.author === "Leslie Lamport"), true);
    const remaining = await memoryClient.lRange(LIST_NAME, 0, -1);
    assert.equal(remaining.length, 1);
    assert.equal(JSON.parse(remaining[0]).method, "UPDATE");
    assert.equal(JSON.parse(remaining[0]).resource, undefined);
  });

  it("applies publisher updates and leaves author deletes in the list", async () => {
    const insertResponse = await publisherInsert.handler({
      httpMethod: "POST",
      path: "/.netlify/functions/publisherInsert",
      body: JSON.stringify({ publisher: "UNED Press", country: "Costa Rica", founded: 1977, genere: "Education", books: [] })
    });
    const deleteResponse = await authorDelete.handler({ httpMethod: "DELETE", path: "/.netlify/functions/authorDelete/2" });
    assert.equal(insertResponse.statusCode, 200);
    assert.equal(deleteResponse.statusCode, 200);
    const publisherTaskResponse = await publisherTasks.handler({ httpMethod: "POST", path: "/.netlify/functions/publisherTasks" });
    assert.equal(publisherTaskResponse.statusCode, 200);
    const listed = await readCollection(publishers.handler, "publishers");
    assert.equal(listed.some((item) => item.publisher === "UNED Press"), true);
    const remaining = await memoryClient.lRange(LIST_NAME, 0, -1);
    assert.equal(JSON.parse(remaining[0]).resource, "author");
    const authorTaskResponse = await authorTasks.handler({ httpMethod: "POST", path: "/.netlify/functions/authorTasks" });
    assert.equal(authorTaskResponse.statusCode, 200);
    const authorsLeft = await readCollection(authors.handler, "authors");
    assert.equal(authorsLeft.some((item) => item.id === "2"), false);
    assert.deepEqual(await memoryClient.lRange(LIST_NAME, 0, -1), []);
  });

  it("refuses to save an update when Redis settings are missing", async () => {
    delete process.env.REDIS_MEMORY;
    try {
      const response = await bookUpdate.handler({
        httpMethod: "PUT",
        path: "/.netlify/functions/bookUpdate/1",
        body: JSON.stringify(bookBody)
      });
      assert.equal(response.statusCode, 422);
      assert.match(response.body, /REDIS_HOST/);
    } finally {
      process.env.REDIS_MEMORY = "true";
    }
  });
});

describe("author update enqueue", () => {
  beforeEach(() => {
    resetMemoryList();
    process.env.REDIS_MEMORY = "true";
  });

  it("stores the author name change without writing the database", async () => {
    resetStore();
    const response = await authorUpdate.handler({
      httpMethod: "PUT",
      path: "/.netlify/functions/authorUpdate/1",
      body: JSON.stringify({ author: "A. Silberschatz", nationality: "American", birth_year: 1952, fields: "Databases", books: [] })
    });
    assert.equal(response.statusCode, 200);
    const pending = JSON.parse((await memoryClient.lRange(LIST_NAME, 0, -1))[0]);
    assert.equal(pending.resource, "author");
    assert.equal(pending.method, "UPDATE");
    assert.equal(pending.body.author, "A. Silberschatz");
    const current = JSON.parse((await authors.handler({ httpMethod: "GET", path: "/.netlify/functions/authors/1" })).body);
    assert.equal(current.author, "Abraham Silberschatz");
  });
});
