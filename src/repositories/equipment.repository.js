import { Op } from 'sequelize';
import { Equipment, Site, EquipmentPassport } from '../models/index.js';

export class EquipmentRepository {
  async findAndCountAll({
    status,
    type,
    search,
    installedFrom,
    installedTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    limit = 10,
    offset = 0,
  } = {}) {
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { serialNumber: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (installedFrom || installedTo) {
      where.installedAt = {};
      if (installedFrom) where.installedAt[Op.gte] = new Date(installedFrom);
      if (installedTo) where.installedAt[Op.lte] = new Date(installedTo);
    }

    const { rows, count } = await Equipment.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        { model: Site, as: 'site' },
        { model: EquipmentPassport, as: 'passport' },
      ],
    });

    return {
      items: rows.map((r) => r.toJSON()),
      total: count,
    };
  }

  async findAll() {
    const items = await Equipment.findAll({
      include: [
        { model: Site, as: 'site' },
        { model: EquipmentPassport, as: 'passport' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return items.map((item) => item.toJSON());
  }

  async findById(id) {
    const item = await Equipment.findByPk(id, {
      include: [
        { model: Site, as: 'site' },
        { model: EquipmentPassport, as: 'passport' },
      ],
    });
    return item ? item.toJSON() : null;
  }

  async findBySerialNumber(serialNumber) {
    const item = await Equipment.findOne({ where: { serialNumber } });
    return item ? item.toJSON() : null;
  }

  async create(data) {
    const created = await Equipment.create(data);
    return created.toJSON();
  }

  async update(id, patch) {
    const item = await Equipment.findByPk(id);
    if (!item) return null;
    await item.update(patch);
    return item.toJSON();
  }

  async delete(id) {
    const deletedCount = await Equipment.destroy({ where: { id } });
    return deletedCount > 0;
  }
}

export const equipmentRepository = new EquipmentRepository();
