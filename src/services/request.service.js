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

        let items = await this.reqRepo.findAll();

        if (status) {
            items = items.filter((item) => item.status === status);
        }
        if (priority) {
            items = items.filter((item) => item.priority === priority);
        }
        if (equipmentId) {
            items = items.filter((item) => item.equipmentId === equipmentId);
        }
        if (createdFrom) {
            const fromTime = new Date(createdFrom).getTime();
            items = items.filter((item) => new Date(item.createdAt).getTime() >= fromTime);
        }
        if (createdTo) {
            const toTime = new Date(createdTo).getTime();
            items = items.filter((item) => new Date(item.createdAt).getTime() <= toTime);
        }
        if (plannedFrom) {
            const fromTime = new Date(plannedFrom).getTime();
            items = items.filter((item) => item.plannedAt && new Date(item.plannedAt).getTime() >= fromTime);
        }
        if (plannedTo) {
            const toTime = new Date(plannedTo).getTime();
            items = items.filter((item) => item.plannedAt && new Date(item.plannedAt).getTime() <= toTime);
        }

        const total = items.length;

        items.sort((a, b) => {
            let valA = a[sortBy] ?? '';
            let valB = b[sortBy] ?? '';

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        const startIndex = (page - 1) * limit;
        const paginatedItems = items.slice(startIndex, startIndex + limit);

        return {
            data: paginatedItems,
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
            status: data.status || 'new',
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

    async updateStatus(id, newStatus) {
        const current = await this.getById(id);

        const allowed = ALLOWED_TRANSITIONS[current.status] || [];
        if (!allowed.includes(newStatus)) {
            throw new ConflictError(
                `Недопустимый переход статуса заявки из "${current.status}" в "${newStatus}". Допустимые: ${allowed.length ? allowed.join(', ') : 'переходы запрещены'
                }`
            );
        }

        return await this.reqRepo.update(id, { status: newStatus });
    }

    async delete(id) {
        await this.getById(id);
        await this.reqRepo.delete(id);
    }
}

export const requestService = new RequestService();
