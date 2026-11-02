module.exports = {
  async up(queryInterface, DataTypes, transaction) {
    await queryInterface.createTable(
      'users',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(254),
          allowNull: false,
        },
        password_hash: {
          type: DataTypes.STRING(255),
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

    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'users_email_unique',
      transaction,
    });
  },

  async down(queryInterface, transaction) {
    await queryInterface.dropTable('users', { transaction });
  },
};
