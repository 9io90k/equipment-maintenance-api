import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';

export class Technician extends Model {}

Technician.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'full_name',
    },
    specialization: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    personnelNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'personnel_number',
    },
  },
  {
    sequelize,
    modelName: 'Technician',
    tableName: 'technicians',
    underscored: true,
    timestamps: true,
  }
);
