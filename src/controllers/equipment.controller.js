import { equipmentService } from '../services/equipment.service.js';

export class EquipmentController {
  constructor(service = equipmentService) {
    this.service = service;
  }

  getAll = async (req, res) => {
    const result = await this.service.getAll(req.valid.query);
    return res.status(200).json(result);
  };

  getById = async (req, res) => {
    const item = await this.service.getById(req.valid.params.id);
    return res.status(200).json({ data: item });
  };

  create = async (req, res) => {
    const created = await this.service.create(req.valid.body);

    res.setHeader('Location', `/api/equipment/${created.id}`);
    return res.status(201).json({ data: created });
  };

  update = async (req, res) => {
    const updated = await this.service.update(req.valid.params.id, req.valid.body);
    return res.status(200).json({ data: updated });
  };

  delete = async (req, res) => {
    await this.service.delete(req.valid.params.id);
    return res.status(204).send();
  };

  getWeather = async (req, res) => {
    const weatherData = await this.service.getWeather(req.valid.params.id);
    return res.status(200).json({ data: weatherData });
  };
}

export const equipmentController = new EquipmentController();
