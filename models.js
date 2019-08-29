const Sequelize = require('sequelize');

const sequelize = new Sequelize({
  database: process.env.DB,
  dialect: 'postgres',
  define: {
    underscored: true,
  },
});

const User = sequelize.define('users', {
  email: Sequelize.STRING,
  password_digest: Sequelize.STRING,
});

module.exports = {
  sequelize,
};
