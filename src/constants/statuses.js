// src/constants/statuses.js
export const WORKFLOW_CATEGORIES = [
  { code: 10, name: 'New', color: 'bg-blue-500' },
  { code: 20, name: 'In Progress', color: 'bg-yellow-500' },
  { code: 30, name: 'Closed', color: 'bg-green-500' },
  { code: 40, name: 'Cancelled', color: 'bg-red-500' },
];

export const getCategoryByCode = (code) => WORKFLOW_CATEGORIES.find(category => category.code === code);