process.env.DATABASE_URL ||= "postgresql://liteboard_test:liteboard_test@localhost:5432/liteboard_test";
process.env.JWT_SECRET ||= "test-secret";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");

const app = require("../server");

function request(server, path) {
  const { port } = server.address();

  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path,
      },
      (res) => {
        let body = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            body,
          });
        });
      },
    );

    req.on("error", reject);
  });
}

test("exports the Express app without starting the server", () => {
  assert.equal(typeof app, "function");
  assert.equal(typeof app.listen, "function");
});

test("responds on the root health endpoint", async () => {
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const response = await request(server, "/");
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.match(payload.message, /Liteboard API is running/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
});
