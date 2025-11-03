const jwt = require("jsonwebtoken");
require("dotenv").config();

// Verify JWT and optionally enforce role
function authenticateToken(requiredRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Expecting "Bearer TOKEN"

    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // attach decoded user info (id, name, role_id, etc.)

      // If route has role restriction
      if (requiredRoles.length > 0 && !requiredRoles.includes(decoded.role_id)) {
        return res.status(403).json({ error: "Forbidden: insufficient permissions." });
      }

      next();
    } catch (err) {
      console.error("Token verification failed:", err.message);
      return res.status(401).json({ error: "Invalid or expired token." });
    }
  };
}

module.exports = authenticateToken;
