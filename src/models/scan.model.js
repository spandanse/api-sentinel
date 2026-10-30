const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Scan = sequelize.define(
  'Scan',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    target: {
      type: DataTypes.STRING(2048),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    status: {
      type: DataTypes.ENUM('queued', 'running', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'queued',
    },

    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    durationMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },

    checksRun: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    summary: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: 'scans',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Scan;
