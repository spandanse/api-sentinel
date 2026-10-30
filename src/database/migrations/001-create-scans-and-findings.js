module.exports = {
  async up(queryInterface, DataTypes, transaction) {
    // Create the scans table first because findings depend on it.
    await queryInterface.createTable(
      'scans',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
        },
        target: {
          type: DataTypes.STRING(2048),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('queued', 'running', 'completed', 'failed'),
          allowNull: false,
          defaultValue: 'queued',
        },
        started_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        completed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        duration_ms: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        checks_run: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        summary: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      { transaction }
    );

    // Findings reference scans, so create this table second.
    await queryInterface.createTable(
      'findings',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
        },
        scan_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'scans',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        check_id: {
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
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      { transaction }
    );

    // A check can appear only once in a particular scan.
    await queryInterface.addIndex(
      'findings',
      ['scan_id', 'check_id'],
      {
        unique: true,
        name: 'findings_scan_id_check_id_unique',
        transaction,
      }
    );
  },

  async down(queryInterface, transaction) {
    // Remove dependent table first because it references scans.
    await queryInterface.dropTable('findings', { transaction });
    await queryInterface.dropTable('scans', { transaction });
  },
};
