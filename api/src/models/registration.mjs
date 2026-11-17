import { DataTypes } from 'sequelize';
import { sequelize } from '../db/sequelize.mjs';

export const Registration = sequelize.define(
  'Registration',
  {
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['eventId', 'email'],
        name: 'registrations_event_email_unique'
      }
    ]
  }
);