import { randomUUID } from 'node:crypto';
import { equipmentRepository } from '../repositories/equipment.repository.js';
import { requestRepository } from '../repositories/request.repository.js';
import { weatherService } from './weather.service.js';
import { NotFoundError, ConflictError } from '../errors/index.js';

export class EquipmentService {
  constructor(
    repo = equipmentRepository,
    reqRepo = requestRepository,
    weather = weatherService
  ) {
    this.repo = repo;
    this.reqRepo = reqRepo;
    this.weather = weather;
  }

  async getAll(query = {}) {
    const {
      status,
      type,
      search,
      installedFrom,
      installedTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = query;

    const offset = (page - 1) * limit;

    const { items, total } = await this.repo.findAndCountAll({
      status,
      type,
      search,
      installedFrom,
      installedTo,
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
    const item = await this.repo.findById(id);
    if (!item) {
      throw new NotFoundError(`Оборудование с ID "${id}" не найдено`);
    }
    return item;
  }

  async create(data) {
    const existing = await this.repo.findBySerialNumber(data.serialNumber);
    if (existing) {
      throw new ConflictError(`Оборудование с серийным номером "${data.serialNumber}" уже зарегистрировано`);
    }

    const now = new Date().toISOString();
    const newEquipment = {
      id: randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    return await this.repo.create(newEquipment);
  }

  async update(id, patch) {
    await this.getById(id);

    if (patch.serialNumber) {
      const existing = await this.repo.findBySerialNumber(patch.serialNumber);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Оборудование с серийным номером "${patch.serialNumber}" уже существует`);
      }
    }

    return await this.repo.update(id, patch);
  }

  async delete(id) {
    await this.getById(id);

    const activeRequests = await this.reqRepo.findActiveByEquipmentId(id);
    if (activeRequests.length > 0) {
      throw new ConflictError(
        'Невозможно удалить оборудование: по нему имеются незакрытые заявки на обслуживание'
      );
    }

    await this.repo.delete(id);
  }

  async getWeather(id, days = 3) {
    const equipment = await this.getById(id);
    const { lat, lon } = equipment.location;

    const forecast = await this.weather.getForecastAndSuitability(lat, lon, days);

    return {
      equipment: {
        id: equipment.id,
        name: equipment.name,
        serialNumber: equipment.serialNumber,
      },
      ...forecast,
    };
  }
}

export const equipmentService = new EquipmentService();
