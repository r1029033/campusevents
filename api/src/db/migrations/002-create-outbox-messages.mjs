import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('OutboxMessages', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    aggregateId: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    availableAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  await queryInterface.addIndex(
    'OutboxMessages',
    ['publishedAt', 'availableAt'],
    {
      name: 'outbox_pending_index'
    }
  );
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('OutboxMessages');
}