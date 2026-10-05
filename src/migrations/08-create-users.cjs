'use strict';

/**@type {import ('sequelize-cli').Migration} */

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
                allowNull: false,
            },
            email: {
                type: Sequelize.STRING(150),
                unique: true,
                allowNull: false,
            },
            password_hash: {
                type: Sequelize.STRING(150),
                allowNull: false,
            },
            role: {
                type: Sequelize.ENUM('viewer', 'technician', 'admin'),
                defaultValue: 'viewer',
                allowNull: false,
            },
            technician_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'technicians',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
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
    },

    async down(queryInterface) {
        await queryInterface.dropTable('users');
    }
}