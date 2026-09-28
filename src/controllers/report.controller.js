import { reportService } from '../services/report.service.js';

export class ReportController {
  constructor(service = reportService) {
    this.service = service;
  }

  getEquipmentLoadReport = async (req, res) => {
    const report = await this.service.getEquipmentLoadReport(req.valid.query);
    return res.status(200).json({ data: report });
  };

  getMaintenanceReport = async (req, res) => {
    return this.getEquipmentLoadReport(req, res);
  };
}

export const reportController = new ReportController();
