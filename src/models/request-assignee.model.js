import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';

export class RequestAssignee extends Model {}

RequestAssignee.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    requestId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'request_id',
    },
    technicianId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'technician_id',
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'member',
      validate: {
        isIn: [['lead', 'member']],
      },
    },
    hours: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0.0,
      validate: {
        min: 0,
      },
    },
  },
  {
    sequelize,
    modelName: 'RequestAssignee',
    tableName: 'request_assignees',
    underscored: true,
    timestamps: true,
  }
);
