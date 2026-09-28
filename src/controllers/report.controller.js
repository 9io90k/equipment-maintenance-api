import { reportService } from '../services/report.service.js';

export class ReportController {
  constructor(service = reportService) {
    this.service = service;
  }

  getMaintenanceReport = async (req, res) => {
    const report = await this.service.getMaintenanceReport(req.valid.query);
    return res.status(200).json({ data: report });
  };
}

export const reportController = new ReportController();
