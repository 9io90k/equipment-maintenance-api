import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';

export class Equipment extends Model {}

Equipment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    siteId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'site_id',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    serialNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'serial_number',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'operational',
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    installedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'installed_at',
    },
  },
  {
    sequelize,
    modelName: 'Equipment',
    tableName: 'equipment',
    underscored: true,
    timestamps: true,
  }
);
