// server/features/employees/employees.routes.js

const express = require("express");
const authenticateToken = require("../../middleware/authMiddleware");
const employeesController = require("./employees.controller");

const router = express.Router();

router.get("/roles", employeesController.getRoles);
router.get("/", employeesController.listEmployees);
router.get("/:id", employeesController.getEmployee);
router.post("/", authenticateToken([1]), employeesController.createEmployee);
router.put("/:id", authenticateToken([1]), employeesController.updateEmployee);

module.exports = router;
