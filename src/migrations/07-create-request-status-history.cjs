'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('request_status_history', {
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
      previous_status: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      new_status: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      changed_by: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('request_status_history');
  },
};
