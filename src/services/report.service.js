import { QueryTypes } from 'sequelize';
import { sequelize } from '../lib/db.js';

export class ReportService {
  async getMaintenanceReport({ startDate = null, endDate = null, siteId = null } = {}) {
    const sql = `
      SELECT 
        s.id AS "siteId",
        s.name AS "siteName",
        s.code AS "siteCode",
        e.type AS "equipmentType",
        COUNT(DISTINCT e.id)::int AS "equipmentCount",
        COUNT(DISTINCT mr.id)::int AS "totalRequests",
        COUNT(DISTINCT CASE WHEN mr.status = 'done' THEN mr.id END)::int AS "completedRequests",
        COUNT(DISTINCT CASE WHEN mr.status IN ('new', 'in_progress') THEN mr.id END)::int AS "activeRequests",
        COUNT(DISTINCT CASE WHEN mr.status = 'rejected' THEN mr.id END)::int AS "rejectedRequests",
        COALESCE(ROUND(SUM(ra.hours)::numeric, 2), 0.00)::float AS "totalTechnicianHours",
        COALESCE(
          ROUND(
            AVG(
              EXTRACT(EPOCH FROM (mr.closed_at - mr.created_at)) / 3600
            )::numeric, 
            2
          ), 
          0.00
        )::float AS "avgResolutionTimeHours"
      FROM sites s
      JOIN equipment e ON e.site_id = s.id
      LEFT JOIN maintenance_requests mr ON mr.equipment_id = e.id
        AND (:startDate::timestamptz IS NULL OR mr.created_at >= :startDate::timestamptz)
        AND (:endDate::timestamptz IS NULL OR mr.created_at <= :endDate::timestamptz)
      LEFT JOIN request_assignees ra ON ra.request_id = mr.id
      WHERE (:siteId::uuid IS NULL OR s.id = :siteId::uuid)
      GROUP BY s.id, s.name, s.code, e.type
      ORDER BY s.name ASC, e.type ASC;
    `;

    const rows = await sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        siteId: siteId || null,
      },
    });

    const overall = {
      totalEquipment: 0,
      totalRequests: 0,
      completedRequests: 0,
      activeRequests: 0,
      rejectedRequests: 0,
      totalTechnicianHours: 0,
    };

    for (const r of rows) {
      overall.totalEquipment += r.equipmentCount;
      overall.totalRequests += r.totalRequests;
      overall.completedRequests += r.completedRequests;
      overall.activeRequests += r.activeRequests;
      overall.rejectedRequests += r.rejectedRequests;
      overall.totalTechnicianHours += r.totalTechnicianHours;
    }

    overall.totalTechnicianHours = Number(overall.totalTechnicianHours.toFixed(2));

    return {
      period: {
        startDate,
        endDate,
      },
      filters: {
        siteId,
      },
      overall,
      breakdown: rows,
    };
  }
}

export const reportService = new ReportService();
