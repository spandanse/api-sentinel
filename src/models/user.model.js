const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: {
        name: 'users_email_unique',
        msg: 'An account with this email already exists.',
      },
      set(value) {
        this.setDataValue('email', value.trim().toLowerCase());
      },
      validate: {
        notEmpty: true,
        isEmail: true,
      },
    },

    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    underscored: true,
  }
);

module.exports = User;
