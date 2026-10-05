import { randomUUID } from 'node:crypto';
import { requestRepository } from '../repositories/request.repository.js';
import { equipmentRepository } from '../repositories/equipment.repository.js';
import { NotFoundError, ConflictError, UnprocessableEntityError, ForbiddenError } from '../errors/index.js';

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

    async updateStatus(id, newStatus, changedBy = 'system', comment = null, currentUser = null) {
        const current = await this.getById(id);

        if (currentUser) {
            if (currentUser.role === 'technician') {
                const isAssigned = await this.reqRepo.isTechnicianAssigned(id, currentUser.technicianId);
                if (!isAssigned) {
                    throw new ForbiddenError('Техник может менять статус только тех заявок, на которые он назначен');
                }
            } else if (currentUser.role !== 'admin') {
                throw new ForbiddenError('Недостаточно прав для изменения статуса заявки');
            }
            changedBy = currentUser.email || changedBy;
        }

        const allowed = ALLOWED_TRANSITIONS[current.status] || [];
        if (!allowed.includes(newStatus)) {
            throw new ConflictError(
                `Недопустимый переход статуса заявки из "${current.status}" в "${newStatus}". Допустимые: ${allowed.length ? allowed.join(', ') : 'переходы запрещены'
                }`
            );
        }

        if (newStatus === 'in_progress') {
            const assigneesCount = await this.reqRepo.countAssignees(id);
            if (assigneesCount === 0) {
                throw new ConflictError(
                    'Невозможно перевести заявку в статус in_progress без назначенных исполнителей'
                );
            }
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

    async setAssignees(id, body) {
        await this.getById(id);

        const assignees = body.assignees || (Array.isArray(body) ? body : [body]);

        const leads = assignees.filter((a) => a.role === 'lead');
        if (leads.length !== 1) {
            throw new UnprocessableEntityError(
                'Бригада должна содержать ровно одного ведущего специалиста (lead)'
            );
        }

        const techIds = assignees.map((a) => a.technicianId);
        if (new Set(techIds).size !== techIds.length) {
            throw new ConflictError('Повторное назначение специалиста в бригаду недопустимо');
        }

        for (const a of assignees) {
            const technician = await this.reqRepo.findTechnicianById(a.technicianId);
            if (!technician) {
                throw new NotFoundError(`Техник с ID "${a.technicianId}" не найден`);
            }
        }

        const result = await this.reqRepo.setAssignees(id, assignees);
        return result;
    }

    async removeAssignee(id, technicianId) {
        await this.getById(id);
        const assigned = await this.reqRepo.findAssignee(id, technicianId);
        if (!assigned) {
            throw new NotFoundError(`Специалист с ID "${technicianId}" не назначен на данную заявку`);
        }
        await this.reqRepo.removeAssignee(id, technicianId);
    }
}

export const requestService = new RequestService();
