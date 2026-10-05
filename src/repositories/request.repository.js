import { Op } from 'sequelize';
import { MaintenanceRequest, Equipment, RequestStatusHistory, Technician, RequestAssignee } from '../models/index.js';
import { sequelize } from '../lib/db.js';

const REQUEST_ATTRIBUTES = [
  'id',
  'equipmentId',
  'title',
  'description',
  'priority',
  'status',
  'author',
  'plannedAt',
  'closedAt',
  'createdAt',
  'updatedAt',
];

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

    const ALLOWED_SORT_FIELDS = {
      id: 'id',
      equipmentId: 'equipmentId',
      title: 'title',
      priority: 'priority',
      status: 'status',
      author: 'author',
      plannedAt: 'plannedAt',
      closedAt: 'closedAt',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };

    const safeSortBy = ALLOWED_SORT_FIELDS[sortBy] || 'createdAt';
    const safeSortOrder = (typeof sortOrder === 'string' && sortOrder.toLowerCase() === 'asc') ? 'ASC' : 'DESC';

    const { rows, count } = await MaintenanceRequest.findAndCountAll({
      attributes: REQUEST_ATTRIBUTES,
      where,
      limit,
      offset,
      order: [[safeSortBy, safeSortOrder]],
      include: [
        {
          model: Equipment,
          as: 'equipment',
          attributes: ['id', 'name', 'type', 'serialNumber', 'status'],
        },
        {
          model: RequestStatusHistory,
          as: 'statusHistory',
          attributes: ['id', 'previousStatus', 'newStatus', 'changedBy', 'comment', 'createdAt'],
        },
        {
          model: Technician,
          as: 'assignees',
          attributes: ['id', 'fullName', 'specialization', 'personnelNumber'],
          through: { attributes: ['id', 'role', 'hours', 'createdAt'] },
        },
      ],
    });

    return {
      items: rows.map((r) => r.toJSON()),
      total: count,
    };
  }

  async findAll() {
    const items = await MaintenanceRequest.findAll({
      attributes: REQUEST_ATTRIBUTES,
      include: [
        {
          model: Equipment,
          as: 'equipment',
          attributes: ['id', 'name', 'type', 'serialNumber', 'status'],
        },
        {
          model: RequestStatusHistory,
          as: 'statusHistory',
          attributes: ['id', 'previousStatus', 'newStatus', 'changedBy', 'comment', 'createdAt'],
        },
        {
          model: Technician,
          as: 'assignees',
          attributes: ['id', 'fullName', 'specialization'],
          through: { attributes: ['id', 'role', 'hours', 'createdAt'] },
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    return items.map((r) => r.toJSON());
  }

  async findById(id) {
    const item = await MaintenanceRequest.findByPk(id, {
      attributes: REQUEST_ATTRIBUTES,
      include: [
        {
          model: Equipment,
          as: 'equipment',
          attributes: ['id', 'name', 'type', 'serialNumber', 'status'],
        },
        {
          model: RequestStatusHistory,
          as: 'statusHistory',
          attributes: ['id', 'previousStatus', 'newStatus', 'changedBy', 'comment', 'createdAt'],
        },
        {
          model: Technician,
          as: 'assignees',
          attributes: ['id', 'fullName', 'specialization'],
          through: { attributes: ['id', 'role', 'hours', 'createdAt'] },
        },
      ],
    });
    return item ? item.toJSON() : null;
  }

  async findByEquipmentId(equipmentId) {
    const items = await MaintenanceRequest.findAll({
      attributes: REQUEST_ATTRIBUTES,
      where: { equipmentId },
      include: [
        {
          model: RequestStatusHistory,
          as: 'statusHistory',
          attributes: ['id', 'previousStatus', 'newStatus', 'changedBy', 'comment', 'createdAt'],
        },
        {
          model: Technician,
          as: 'assignees',
          attributes: ['id', 'fullName', 'specialization'],
          through: { attributes: ['id', 'role', 'hours', 'createdAt'] },
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    return items.map((r) => r.toJSON());
  }

  async findActiveByEquipmentId(equipmentId) {
    const items = await MaintenanceRequest.findAll({
      attributes: ['id', 'equipmentId', 'status', 'title'],
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
      const request = await MaintenanceRequest.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
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

  async getStatusHistory(requestId) {
    const history = await RequestStatusHistory.findAll({
      attributes: ['id', 'requestId', 'previousStatus', 'newStatus', 'changedBy', 'comment', 'createdAt'],
      where: { requestId },
      order: [['createdAt', 'ASC']],
    });
    return history.map((h) => h.toJSON());
  }

  async isTechnicianAssigned(requestId, technicianId) {
    if (!technicianId) return false;
    const count = await RequestAssignee.count({
      where: { requestId, technicianId },
    });
    return count > 0;
  }

  async setAssignees(requestId, assignees) {
    return await sequelize.transaction(async (t) => {
      await RequestAssignee.destroy({ where: { requestId }, transaction: t });
      const records = assignees.map((a) => ({
        requestId,
        technicianId: a.technicianId,
        role: a.role || 'member',
        hours: a.hours || 0,
      }));
      const created = await RequestAssignee.bulkCreate(records, { transaction: t });
      return created.map((c) => c.toJSON());
    });
  }

  async removeAssignee(requestId, technicianId) {
    const count = await RequestAssignee.destroy({
      where: { requestId, technicianId },
    });
    return count > 0;
  }

  async countAssignees(requestId) {
    return await RequestAssignee.count({ where: { requestId } });
  }

  async findAssignee(requestId, technicianId) {
    const item = await RequestAssignee.findOne({ where: { requestId, technicianId } });
    return item ? item.toJSON() : null;
  }

  async findTechnicianById(id) {
    const tech = await Technician.findByPk(id, {
      attributes: ['id', 'fullName', 'specialization', 'personnelNumber'],
    });
    return tech ? tech.toJSON() : null;
  }
}

export const requestRepository = new RequestRepository();