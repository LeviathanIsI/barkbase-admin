/**
 * Main export for BarkBase Ops layer
 */

const db = require('./db');
const auth = require('./auth');

module.exports = {
  ...db,
  ...auth,
};
