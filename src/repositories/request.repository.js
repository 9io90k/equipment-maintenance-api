import { Op } from 'sequelize';
import { MaintenanceRequest, Equipment, RequestStatusHistory, Technician } from '../models/index.js';
import { sequelize } from '../lib/db.js';

export class RequestRepository {
  async findAndCountAll({
    status,
    priority,
    equipmentId,
    createdFrom,
    createdTo,
    plannedFrom,
    plannedTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    limit = 10,
    offset = 0,
  } = {}) {
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (equipmentId) where.equipmentId = equipmentId;

    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt[Op.gte] = new Date(createdFrom);
      if (createdTo) where.createdAt[Op.lte] = new Date(createdTo);
    }

    if (plannedFrom || plannedTo) {
      where.plannedAt = {};
      if (plannedFrom) where.plannedAt[Op.gte] = new Date(plannedFrom);
      if (plannedTo) where.plannedAt[Op.lte] = new Date(plannedTo);
    }

    const { rows, count } = await MaintenanceRequest.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        { model: Equipment, as: 'equipment' },
        { model: RequestStatusHistory, as: 'statusHistory' },
        { model: Technician, as: 'assignees' },
      ],
    });

    return {
      items: rows.map((r) => r.toJSON()),
      total: count,
    };
  }

  async findAll() {
    const items = await MaintenanceRequest.findAll({
      include: [
        { model: Equipment, as: 'equipment' },
        { model: RequestStatusHistory, as: 'statusHistory' },
        { model: Technician, as: 'assignees' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return items.map((r) => r.toJSON());
  }

  async findById(id) {
    const item = await MaintenanceRequest.findByPk(id, {
      include: [
        { model: Equipment, as: 'equipment' },
        { model: RequestStatusHistory, as: 'statusHistory' },
        { model: Technician, as: 'assignees' },
      ],
    });
    return item ? item.toJSON() : null;
  }

  async findByEquipmentId(equipmentId) {
    const items = await MaintenanceRequest.findAll({
      where: { equipmentId },
      include: [
        { model: RequestStatusHistory, as: 'statusHistory' },
        { model: Technician, as: 'assignees' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return items.map((r) => r.toJSON());
  }

  async findActiveByEquipmentId(equipmentId) {
    const items = await MaintenanceRequest.findAll({
      where: {
        equipmentId,
        status: { [Op.in]: ['new', 'in_progress'] },
      },
    });
    return items.map((r) => r.toJSON());
  }

  async create(data) {
    return await sequelize.transaction(async (t) => {
      const request = await MaintenanceRequest.create(data, { transaction: t });

      await RequestStatusHistory.create(
        {
          requestId: request.id,
          previousStatus: null,
          newStatus: request.status || 'new',
          changedBy: data.author || 'system',
          comment: 'Создание заявки на обслуживание',
        },
        { transaction: t }
      );

      return request.toJSON();
    });
  }

  async update(id, patch, { changedBy = 'system', comment = null } = {}) {
    return await sequelize.transaction(async (t) => {
      const request = await MaintenanceRequest.findByPk(id, { transaction: t });
      if (!request) return null;

      const previousStatus = request.status;
      const statusChanged = patch.status && patch.status !== previousStatus;

      const updateData = { ...patch };
      if (patch.status && ['done', 'rejected'].includes(patch.status) && !patch.closedAt) {
        updateData.closedAt = new Date();
      }

      await request.update(updateData, { transaction: t });

      if (statusChanged) {
        await RequestStatusHistory.create(
          {
            requestId: id,
            previousStatus,
            newStatus: patch.status,
            changedBy,
            comment,
          },
          { transaction: t }
        );
      }

      return request.toJSON();
    });
  }

  async delete(id) {
    const deletedCount = await MaintenanceRequest.destroy({ where: { id } });
    return deletedCount > 0;
  }
}

export const requestRepository = new RequestRepository();