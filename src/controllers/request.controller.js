import { requestService } from '../services/request.service.js';

export class RequestController {
  constructor(service = requestService) {
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
    res.setHeader('Location', `/api/requests/${created.id}`);
    return res.status(201).json({ data: created });
  };

  update = async (req, res) => {
    const updated = await this.service.update(req.valid.params.id, req.valid.body);
    return res.status(200).json({ data: updated });
  };

  updateStatus = async (req, res) => {
    const updated = await this.service.updateStatus(req.valid.params.id, req.valid.body.status);
    return res.status(200).json({ data: updated });
  };

  delete = async (req, res) => {
    await this.service.delete(req.valid.params.id);
    return res.status(204).send();
  };

  getByEquipmentId = async (req, res) => {
    const items = await this.service.getByEquipmentId(req.valid.params.id);
    return res.status(200).json({ data: items });
  };
}

export const requestController = new RequestController();
