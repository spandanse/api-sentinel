const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Finding = sequelize.define(
  'Finding',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    scanId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    checkId: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM('PASS', 'FAIL', 'ERROR'),
      allowNull: false,
    },

    severity: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },

    confidence: {
      type: DataTypes.ENUM('high', 'medium', 'low'),
      allowNull: false,
    },

    evidence: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    remediation: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: 'findings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['scan_id', 'check_id'],
      },
    ],
  }
);

module.exports = Finding;
