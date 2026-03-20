let isClosed = false;

const { sequelize } = require('../db');

beforeAll(async () => {
  try {
    if (!isClosed) {
      await sequelize.sync({ force: true });
    }
  } catch (error) {
    console.error('Setup beforeAll error:', error);
  }
}, 30000);

afterAll(async () => {
  try {
    if (!isClosed) {
      isClosed = true;
      await sequelize.close();
    }
  } catch (error) {
    // Ignore close errors
  }
}, 30000);
