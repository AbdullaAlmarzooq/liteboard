// server/features/employees/employees.controller.js

const employeesService = require("./employees.service");

const sendEmployeeError = (res, err, { logMessage, fallbackBody }) => {
  if (employeesService.isEmployeesServiceError(err)) {
    return res.status(err.status).json(err.body);
  }

  console.error(logMessage, err);
  return res.status(500).json(fallbackBody);
};

const getRoles = async (req, res) => {
  try {
    const roles = await employeesService.getRoles();
    res.json(roles);
  } catch (err) {
    sendEmployeeError(res, err, {
      logMessage: "Error fetching roles:",
      fallbackBody: { error: "Failed to fetch roles" },
    });
  }
};

const listEmployees = async (req, res) => {
  try {
    const employees = await employeesService.listEmployees();
    res.json(employees);
  } catch (err) {
    sendEmployeeError(res, err, {
      logMessage: "Error fetching employees:",
      fallbackBody: { error: "Failed to fetch employees" },
    });
  }
};

const getEmployee = async (req, res) => {
  try {
    const employee = await employeesService.getEmployeeById({ id: req.params.id });
    res.json(employee);
  } catch (err) {
    sendEmployeeError(res, err, {
      logMessage: "Error fetching employee:",
      fallbackBody: { error: "Failed to fetch employee" },
    });
  }
};

const createEmployee = async (req, res) => {
  try {
    const employee = await employeesService.createEmployee({
      body: req.body,
      user: req.user,
    });
    res.status(201).json(employee);
  } catch (err) {
    sendEmployeeError(res, err, {
      logMessage: "Error creating employee:",
      fallbackBody: { error: "Failed to create employee" },
    });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const employee = await employeesService.updateEmployee({
      id: req.params.id,
      body: req.body,
      user: req.user,
    });
    res.json(employee);
  } catch (err) {
    sendEmployeeError(res, err, {
      logMessage: "Error updating employee:",
      fallbackBody: { error: "Failed to update employee" },
    });
  }
};

module.exports = {
  getRoles,
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
};
