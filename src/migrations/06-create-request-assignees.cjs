'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('request_assignees', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      request_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'maintenance_requests',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      technician_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'technicians',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'member',
      },
      hours: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });


    await queryInterface.addConstraint('request_assignees', {
      fields: ['request_id', 'technician_id'],
      type: 'unique',
      name: 'unique_request_technician',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('request_assignees');
  },
};
