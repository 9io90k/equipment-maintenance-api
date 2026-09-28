import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';

export class EquipmentPassport extends Model {}

EquipmentPassport.init(
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
      unique: true,
      field: 'equipment_id',
    },
    manufacturer: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    nominalPower: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'nominal_power',
    },
    lastInspectionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'last_inspection_date',
    },
  },
  {
    sequelize,
    modelName: 'EquipmentPassport',
    tableName: 'equipment_passports',
    underscored: true,
    timestamps: true,
  }
);
