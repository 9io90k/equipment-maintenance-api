import { QueryTypes } from 'sequelize';
import { Site } from '../models/index.js';
import { sequelize } from '../lib/db.js';
import { NotFoundError } from '../errors/index.js';

export class SiteService {
  async getAll() {
    const sites = await Site.findAll({
      attributes: ['id', 'name', 'code', 'region', 'coordinates', 'createdAt', 'updatedAt'],
      order: [['name', 'ASC']],
    });
    return sites.map((s) => s.toJSON());
  }

  async getById(id) {
    const site = await Site.findByPk(id, {
      attributes: ['id', 'name', 'code', 'region', 'coordinates', 'createdAt', 'updatedAt'],
    });
    if (!site) {
      throw new NotFoundError(`Площадка с ID "${id}" не найдена`);
    }
    return site.toJSON();
  }

  async getSummary(id) {
    const site = await this.getById(id);

    // 1. Агрегация оборудования и мощности средствами PostgreSQL
    const [equipAgg] = await sequelize.query(
      `
      SELECT 
        COUNT(e.id)::int AS "totalEquipment",
        COALESCE(ROUND(SUM(p.nominal_power)::numeric, 2), 0.00)::float AS "totalNominalPower"
      FROM equipment e
      LEFT JOIN equipment_passports p ON p.equipment_id = e.id
      WHERE e.site_id = :siteId
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { siteId: id },
      }
    );

    // 2. Распределение оборудования по статусам
    const statusRows = await sequelize.query(
      `
      SELECT status, COUNT(*)::int AS count
      FROM equipment
      WHERE site_id = :siteId
      GROUP BY status
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { siteId: id },
      }
    );

    const equipmentByStatus = {
      operational: 0,
      under_maintenance: 0,
      decommissioned: 0,
    };
    for (const r of statusRows) {
      equipmentByStatus[r.status] = r.count;
    }

    // 3. Распределение оборудования по типам
    const typeRows = await sequelize.query(
      `
      SELECT type, COUNT(*)::int AS count
      FROM equipment
      WHERE site_id = :siteId
      GROUP BY type
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { siteId: id },
      }
    );

    const equipmentByType = {};
    for (const r of typeRows) {
      equipmentByType[r.type] = r.count;
    }

    // 4. Агрегация заявок по статусам, приоритетам и среднему времени закрытия (MTTR) средствами PostgreSQL
    const [reqAgg] = await sequelize.query(
      `
      SELECT 
        COUNT(mr.id)::int AS "totalRequests",
        COUNT(CASE WHEN mr.status = 'new' THEN 1 END)::int AS "newRequests",
        COUNT(CASE WHEN mr.status = 'in_progress' THEN 1 END)::int AS "inProgressRequests",
        COUNT(CASE WHEN mr.status = 'done' THEN 1 END)::int AS "doneRequests",
        COUNT(CASE WHEN mr.status = 'rejected' THEN 1 END)::int AS "rejectedRequests",
        COUNT(CASE WHEN mr.priority = 'low' THEN 1 END)::int AS "lowPriority",
        COUNT(CASE WHEN mr.priority = 'medium' THEN 1 END)::int AS "mediumPriority",
        COUNT(CASE WHEN mr.priority = 'high' THEN 1 END)::int AS "highPriority",
        COUNT(CASE WHEN mr.priority = 'critical' THEN 1 END)::int AS "criticalPriority",
        COALESCE(
          ROUND(
            AVG(
              CASE WHEN mr.status = 'done' AND mr.closed_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (mr.closed_at - mr.created_at)) / 3600 END
            )::numeric, 
            2
          ), 
          0.00
        )::float AS "avgResolutionTimeHours"
      FROM maintenance_requests mr
      JOIN equipment e ON e.id = mr.equipment_id
      WHERE e.site_id = :siteId
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { siteId: id },
      }
    );

    const activeRequestsCount = (reqAgg?.newRequests || 0) + (reqAgg?.inProgressRequests || 0);

    return {
      site,
      metrics: {
        totalEquipment: equipAgg?.totalEquipment || 0,
        totalNominalPower: equipAgg?.totalNominalPower || 0,
        activeRequestsCount,
        equipmentByStatus,
        equipmentByType,
        requestsByStatus: {
          new: reqAgg?.newRequests || 0,
          in_progress: reqAgg?.inProgressRequests || 0,
          done: reqAgg?.doneRequests || 0,
          rejected: reqAgg?.rejectedRequests || 0,
        },
        requestsByPriority: {
          low: reqAgg?.lowPriority || 0,
          medium: reqAgg?.mediumPriority || 0,
          high: reqAgg?.highPriority || 0,
          critical: reqAgg?.criticalPriority || 0,
        },
        totalRequests: reqAgg?.totalRequests || 0,
        avgResolutionTimeHours: reqAgg?.avgResolutionTimeHours || 0,
      },
    };
  }
}

export const siteService = new SiteService();
