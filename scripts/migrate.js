require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { DataTypes, QueryTypes } = require('sequelize');
const sequelize = require('../src/config/database');

const migrationsDirectory = path.join(
  __dirname,
  '../src/database/migrations'
);

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Database connection successful.');

    const queryInterface = sequelize.getQueryInterface();

    // This table records which migrations have already run.
    const migrationsTableExists = await queryInterface.tableExists(
      'schema_migrations'
    );

    if (!migrationsTableExists) {
      await queryInterface.createTable('schema_migrations', {
        name: {
          type: DataTypes.STRING(255),
          primaryKey: true,
          allowNull: false,
        },
        executed_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });

      console.log('Created schema_migrations table.');
    }

    const completedMigrations = await sequelize.query(
      'SELECT name FROM schema_migrations',
      { type: QueryTypes.SELECT }
    );

    const completedNames = new Set(
      completedMigrations.map((migration) => migration.name)
    );

    const migrationFiles = fs
      .readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith('.js'))
      .sort();

    for (const file of migrationFiles) {
      if (completedNames.has(file)) {
        console.log(`Already applied: ${file}`);
        continue;
      }

      const migration = require(path.join(migrationsDirectory, file));

      console.log(`Applying migration: ${file}`);

      await sequelize.transaction(async (transaction) => {
        await migration.up(queryInterface, DataTypes, transaction);

        await queryInterface.bulkInsert(
          'schema_migrations',
          [
            {
              name: file,
              executed_at: new Date(),
            },
          ],
          { transaction }
        );
      });

      console.log(`Successfully applied: ${file}`);
    }

    console.log('Database migrations completed.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

migrate();
