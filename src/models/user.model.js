import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';

export class User extends Model {
  toJSON() {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
  }
}

User.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        passwordHash: {
            type: DataTypes.STRING(150),
            allowNull: false,
            field: 'password_hash',
        },
        role: {
            type: DataTypes.ENUM('viewer', 'technician', 'admin'),
            allowNull: false,
            defaultValue: 'viewer',
        },
        technicianId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'technician_id',
        },
    },

    {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        underscored: true,
        timestamps: true,
    }
);