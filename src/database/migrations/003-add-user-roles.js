module.exports = {
  async up(queryInterface, DataTypes, transaction) {
    await queryInterface.addColumn(
      'users',
      'role',
      {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
      },
      { transaction }
    );
  },

  async down(queryInterface, transaction) {
    await queryInterface.removeColumn('users', 'role', { transaction });

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_users_role";',
      { transaction }
    );
  },
};
