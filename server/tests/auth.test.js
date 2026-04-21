const request = require("supertest");
const app = require("../src/app");

describe("POST /api/auth/login", () => {
  it("returns 400 when required fields are missing", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: expect.any(String),
      }),
    );
  });

  it("returns 400 when email format is invalid", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "invalid-email", password: "password123" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: expect.stringContaining("email"),
      }),
    );
  });
});
