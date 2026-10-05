'use strict';

const bcrypt = require('bcrypt');

const USERS = {
  admin: '77777777-7777-4777-8777-777777777001',
  technician: '77777777-7777-4777-8777-777777777002',
  viewer: '77777777-7777-4777-8777-777777777003',
};

const TECH_IVANOV = '33333333-3333-4333-8333-333333333001';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        id: USERS.admin,
        email: 'admin@energy.local',
        password_hash: passwordHash,
        role: 'admin',
        technician_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: USERS.technician,
        email: 'technician@energy.local',
        password_hash: passwordHash,
        role: 'technician',
        technician_id: TECH_IVANOV,
        created_at: now,
        updated_at: now,
      },
      {
        id: USERS.viewer,
        email: 'viewer@energy.local',
        password_hash: passwordHash,
        role: 'viewer',
        technician_id: null,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      id: [USERS.admin, USERS.technician, USERS.viewer],
    });
  },
};
