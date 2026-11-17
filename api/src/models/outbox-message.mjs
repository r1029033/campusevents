import { DataTypes } from 'sequelize';
import { sequelize } from '../db/sequelize.mjs';

export const OutboxMessage = sequelize.define(
  'OutboxMessage',
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
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
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    indexes: [
      {
        fields: [
          'publishedAt',
          'availableAt'
        ],
        name: 'outbox_pending_index'
      }
    ]
  }
); 