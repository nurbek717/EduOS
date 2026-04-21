const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");

describe("MongoDB integration", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, { autoIndex: true });
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    await Promise.all(
      Object.values(collections).map((collection) => collection.deleteMany({})),
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it("saves user with hashed password", async () => {
    const created = await User.create({
      name: "Test Director",
      email: "director@test.uz",
      password: "password123",
      role: "director",
    });

    expect(created._id).toBeDefined();
    expect(created.password).not.toBe("password123");

    const isValid = await created.comparePassword("password123");
    expect(isValid).toBe(true);
  });

  it("logs in with valid credentials and returns token", async () => {
    await User.create({
      name: "School Admin",
      email: "schooladmin@test.uz",
      password: "password123",
      role: "school_admin",
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "schooladmin@test.uz", password: "password123" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({
          email: "schooladmin@test.uz",
          role: "school_admin",
        }),
      }),
    );
  });
});
