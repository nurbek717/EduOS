const request = require("supertest");
const app = require("../src/app");

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: "ok",
      }),
    );
    expect(typeof response.body.time).toBe("string");
  });
});
