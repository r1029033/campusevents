import { DataTypes, Op } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('Events', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false
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

  await queryInterface.addConstraint('Events', {
    fields: ['capacity'],
    type: 'check',
    where: {
      capacity: {
        [Op.gt]: 0
      }
    },
    name: 'events_capacity_positive'
  });

  await queryInterface.addIndex(
    'Events',
    ['startsAt'],
    {
      name: 'events_starts_at_index'
    }
  );

  await queryInterface.createTable('Registrations', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Events',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
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
    'Registrations',
    ['eventId', 'email'],
    {
      unique: true,
      name: 'registrations_event_email_unique'
    }
  );

  await queryInterface.addIndex(
    'Registrations',
    ['eventId'],
    {
      name: 'registrations_event_index'
    }
  );
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('Registrations');
  await queryInterface.dropTable('Events');
}