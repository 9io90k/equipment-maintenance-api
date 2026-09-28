import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';

export class Site extends Model {}

Site.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    region: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    coordinates: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Site',
    tableName: 'sites',
    underscored: true,
    timestamps: true,
  }
);
