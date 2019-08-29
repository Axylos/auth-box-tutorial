require('dotenv').config();
const { sequelize } = require('./models');

const main = async () => {
  try {
    await sequelize.sync({ force: true });
  } catch (e) {
    console.log(e);
  } finally {
    process.exit();
  }
}

main();
