module.exports = {
  async up(queryInterface, DataTypes, transaction) {
    await queryInterface.addColumn(
      'scans',
      'user_id',
      {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      { transaction }
    );

    await queryInterface.addIndex('scans', ['user_id'], {
      name: 'scans_user_id_index',
      transaction,
    });
  },

  async down(queryInterface, transaction) {
    await queryInterface.removeIndex(
      'scans',
      'scans_user_id_index',
      { transaction }
    );

    await queryInterface.removeColumn('scans', 'user_id', {
      transaction,
    });
  },
};
