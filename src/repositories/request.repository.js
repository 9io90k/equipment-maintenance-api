import fs from 'node:fs/promises';
import path from 'node:path';
import { getLog } from '../lib/context.js';

const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'requests.json');

export class RequestRepository {
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
                this.items = [];
                await this.persist();
            } else {
                getLog().error({ err }, 'Ошибка чтения data/requests.json');
                this.items = [];
            }
        }
        this.isLoaded = true;
    }

    async persist() {
        try {
            await fs.writeFile(DATA_FILE, JSON.stringify(this.items, null, 2), 'utf-8');
        } catch (err) {
            getLog().error({ err }, 'Ошибка записи в data/requests.json');
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

    async findByEquipmentId(equipmentId) {
        await this.init();
        return this.items.filter((item) => item.equipmentId === equipmentId);
    }

    async findActiveByEquipmentId(equipmentId) {
        await this.init();
        const activeStatuses = ['new', 'in_progress'];
        return this.items.filter(
            (item) => item.equipmentId === equipmentId && activeStatuses.includes(item.status)
        );
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
            id: this.items[index].id,
            equipmentId: this.items[index].equipmentId,
            createdAt: this.items[index].createdAt,
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

export const requestRepository = new RequestRepository();