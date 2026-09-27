import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';

export class RequestStatusHistory extends Model { }

RequestStatusHistory.init(
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
    previousStatus: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'previous_status',
    },
    newStatus: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'new_status',
    },
    changedBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'changed_by',
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    modelName: 'RequestStatusHistory',
    tableName: 'request_status_history',
    underscored: true,
    timestamps: false,
  }
);
