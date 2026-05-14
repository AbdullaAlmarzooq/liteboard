// server/features/auth/auth.service.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../db/db");

class AuthServiceError extends Error {
  constructor(status, body, code = "AUTH_SERVICE_ERROR") {
    const normalizedBody = typeof body === "string" ? { error: body } : body;
    super(normalizedBody?.error || "Auth service error");
    this.name = "AuthServiceError";
    this.status = status;
    this.code = code;
    this.body = normalizedBody || { error: this.message };
  }
}

const createServiceError = (status, body, code) =>
  new AuthServiceError(status, body, code);

const isAuthServiceError = (error) => error instanceof AuthServiceError;

const login = async ({ email, password }) => {
  if (!email || !password) {
    throw createServiceError(
      400,
      { error: "Email and password are required." },
      "VALIDATION_ERROR"
    );
  }

  const { rows } = await db.query(
    `
        SELECT e.id, e.name, e.email, e.password_hash, e.role_id, e.workgroup_id, e.active,
               r.name AS role_name,
               wg.name AS workgroup_name
        FROM employees e
        LEFT JOIN roles r ON e.role_id = r.id
        LEFT JOIN workgroups wg ON e.workgroup_id = wg.id
        WHERE e.email = $1
      `,
    [email]
  );
  const user = rows[0];

  if (!user) {
    throw createServiceError(
      401,
      { error: "Invalid email or password." },
      "INVALID_CREDENTIALS"
    );
  }

  if (!user.active) {
    throw createServiceError(
      403,
      { error: "Account is inactive." },
      "INACTIVE_ACCOUNT"
    );
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    throw createServiceError(
      401,
      { error: "Invalid email or password." },
      "INVALID_CREDENTIALS"
    );
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role_id: user.role_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

  return {
    message: "Login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
      workgroup_id: user.workgroup_id,
      workgroup_name: user.workgroup_name,
    },
  };
};

module.exports = {
  AuthServiceError,
  isAuthServiceError,
  login,
};
