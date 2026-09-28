import { randomUUID } from 'node:crypto';
import { requestRepository } from '../repositories/request.repository.js';
import { equipmentRepository } from '../repositories/equipment.repository.js';
import { NotFoundError, ConflictError } from '../errors/index.js';

const ALLOWED_TRANSITIONS = {
    new: ['in_progress', 'rejected'],
    in_progress: ['done', 'rejected'],
    done: [],
    rejected: [],
};

export class RequestService {
    constructor(reqRepo = requestRepository, equipRepo = equipmentRepository) {
        this.reqRepo = reqRepo;
        this.equipRepo = equipRepo;
    }

    async getAll(query = {}) {
        const {
            status,
            priority,
            equipmentId,
            createdFrom,
            createdTo,
            plannedFrom,
            plannedTo,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 10,
        } = query;

        const offset = (page - 1) * limit;
        const { items, total } = await this.reqRepo.findAndCountAll({
            status,
            priority,
            equipmentId,
            createdFrom,
            createdTo,
            plannedFrom,
            plannedTo,
            sortBy,
            sortOrder,
            limit,
            offset,
        });

        return {
            data: items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async getById(id) {
        const item = await this.reqRepo.findById(id);
        if (!item) {
            throw new NotFoundError(`Заявка на обслуживание с ID "${id}" не найдена`);
        }
        return item;
    }

    async getByEquipmentId(equipmentId) {
        const equipment = await this.equipRepo.findById(equipmentId);
        if (!equipment) {
            throw new NotFoundError(`Оборудование с ID "${equipmentId}" не найдено`);
        }
        return await this.reqRepo.findByEquipmentId(equipmentId);
    }

    async create(data) {
        const equipment = await this.equipRepo.findById(data.equipmentId);
        if (!equipment) {
            throw new NotFoundError(`Оборудование с ID "${data.equipmentId}" не найдено`);
        }

        const now = new Date().toISOString();
        const newRequest = {
            id: randomUUID(),
            equipmentId: data.equipmentId,
            title: data.title,
            description: data.description || '',
            priority: data.priority,
            status: 'new',
            plannedAt: data.plannedAt || null,
            createdAt: now,
            updatedAt: now,
        };

        return await this.reqRepo.create(newRequest);
    }

    async update(id, patch) {
        await this.getById(id);
        return await this.reqRepo.update(id, patch);
    }

    async updateStatus(id, newStatus, changedBy = 'system', comment = null) {
        const current = await this.getById(id);

        const allowed = ALLOWED_TRANSITIONS[current.status] || [];
        if (!allowed.includes(newStatus)) {
            throw new ConflictError(
                `Недопустимый переход статуса заявки из "${current.status}" в "${newStatus}". Допустимые: ${allowed.length ? allowed.join(', ') : 'переходы запрещены'
                }`
            );
        }

        return await this.reqRepo.update(id, { status: newStatus }, { changedBy, comment });
    }

    async delete(id) {
        await this.getById(id);
        await this.reqRepo.delete(id);
    }

    async getStatusHistory(id) {
        await this.getById(id);
        return await this.reqRepo.getStatusHistory(id);
    }
    async addAssignee(id, { technicianId, role = 'member', hours = 0.0 }) {
        await this.getById(id);
        const technician = await this.reqRepo.findTechnicianById(technicianId);
        if (!technician) {
            throw new NotFoundError(`Техник с ID "${technicianId}" не найден`);
        }
        return await this.reqRepo.addAssignee(id, { technicianId, role, hours });
    }
}

export const requestService = new RequestService();
