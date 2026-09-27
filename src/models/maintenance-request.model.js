import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';

export class MaintenanceRequest extends Model {}

MaintenanceRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    equipmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'equipment_id',
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'new',
    },
    author: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'system',
    },
    plannedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'planned_at',
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'closed_at',
    },
  },
  {
    sequelize,
    modelName: 'MaintenanceRequest',
    tableName: 'maintenance_requests',
    underscored: true,
    timestamps: true,
  }
);
