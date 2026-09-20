import fs from 'node:fs/promises';
import path from 'node:path';
import { getLog } from '../lib/context.js';

const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'equipment.json');

export class EquipmentRepository {
  constructor() {
    this.items = [];
    this.isLoaded = false;
  }

  async init() {
    if (this.isLoaded) return;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const content = await fs.readFile(DATA_FILE, 'utf-8');
      this.items = JSON.parse(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // Если файла еще нет — стартуем с пустым массивом и создаем файл
        this.items = [];
        await this.persist();
      } else {
        getLog().error({ err }, 'Ошибка чтения data/equipment.json');
        this.items = [];
      }
    }
    this.isLoaded = true;
  }

  async persist() {
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(this.items, null, 2), 'utf-8');
    } catch (err) {
      getLog().error({ err }, 'Ошибка сохранения в data/equipment.json');
    }
  }

  async findAll() {
    await this.init();
    return [...this.items];
  }

  async findById(id) {
    await this.init();
    return this.items.find((item) => item.id === id) || null;
  }

  async findBySerialNumber(serialNumber) {
    await this.init();
    return this.items.find((item) => item.serialNumber === serialNumber) || null;
  }

  async create(data) {
    await this.init();
    this.items.push(data);
    await this.persist();
    return { ...data };
  }

  async update(id, patch) {
    await this.init();
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;

    this.items[index] = {
      ...this.items[index],
      ...patch,
      id: this.items[index].id, // Защита: id менять нельзя
      createdAt: this.items[index].createdAt, // Защита: createdAt менять нельзя
      updatedAt: new Date().toISOString(),
    };

    await this.persist();
    return { ...this.items[index] };
  }

  async delete(id) {
    await this.init();
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return false;

    this.items.splice(index, 1);
    await this.persist();
    return true;
  }
}

// Экспортируем синглтон репозитория
export const equipmentRepository = new EquipmentRepository();
