import { siteService } from '../services/site.service.js';

export class SiteController {
  constructor(service = siteService) {
    this.service = service;
  }

  getAll = async (_req, res) => {
    const sites = await this.service.getAll();
    return res.status(200).json({ data: sites });
  };

  getById = async (req, res) => {
    const site = await this.service.getById(req.valid.params.id);
    return res.status(200).json({ data: site });
  };

  getSummary = async (req, res) => {
    const summary = await this.service.getSummary(req.valid.params.id);
    return res.status(200).json({ data: summary });
  };
}

export const siteController = new SiteController();
