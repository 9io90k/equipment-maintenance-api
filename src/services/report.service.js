import { QueryTypes } from 'sequelize';
import { sequelize } from '../lib/db.js';

export class ReportService {
  async getEquipmentLoadReport({ startDate = null, endDate = null, siteId = null, minRequests = null } = {}) {
    const sql = `
      WITH request_stats AS (
        SELECT 
          mr.id,
          mr.equipment_id,
          mr.status,
          mr.created_at,
          mr.closed_at,
          COALESCE(SUM(ra.hours), 0) AS planned_hours
        FROM maintenance_requests mr
        LEFT JOIN request_assignees ra ON ra.request_id = mr.id
        WHERE (:startDate::timestamptz IS NULL OR mr.created_at >= :startDate::timestamptz)
          AND (:endDate::timestamptz IS NULL OR mr.created_at <= :endDate::timestamptz)
        GROUP BY mr.id, mr.equipment_id, mr.status, mr.created_at, mr.closed_at
      )
      SELECT 
        e.id AS "equipmentId",
        e.name AS "equipmentName",
        e.serial_number AS "serialNumber",
        e.type AS "equipmentType",
        s.id AS "siteId",
        s.name AS "siteName",
        s.code AS "siteCode",
        COUNT(rs.id)::int AS "totalRequests",
        COUNT(CASE WHEN rs.status = 'done' THEN rs.id END)::int AS "closedRequests",
        COUNT(CASE WHEN rs.status IN ('new', 'in_progress') THEN rs.id END)::int AS "activeRequests",
        COALESCE(ROUND(SUM(rs.planned_hours)::numeric, 2), 0.00)::float AS "totalPlannedHours",
        MAX(rs.closed_at) AS "lastMaintenanceDate",
        COALESCE(
          ROUND(
            AVG(
              CASE WHEN rs.status = 'done' AND rs.closed_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (rs.closed_at - rs.created_at)) / 3600 END
            )::numeric, 
            2
          ), 
          0.00
        )::float AS "avgResolutionTimeHours"
      FROM equipment e
      JOIN sites s ON s.id = e.site_id
      LEFT JOIN request_stats rs ON rs.equipment_id = e.id
      WHERE (:siteId::uuid IS NULL OR s.id = :siteId::uuid)
      GROUP BY e.id, e.name, e.serial_number, e.type, s.id, s.name, s.code
      HAVING (:minRequests::int IS NULL OR COUNT(rs.id) >= :minRequests::int)
      ORDER BY "totalRequests" DESC, e.name ASC;
    `;

    const rows = await sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        siteId: siteId || null,
        minRequests: minRequests !== null && minRequests !== undefined ? Number(minRequests) : null,
      },
    });

    const overall = {
      totalEquipment: rows.length,
      totalRequests: 0,
      closedRequests: 0,
      activeRequests: 0,
      totalPlannedHours: 0,
    };

    for (const r of rows) {
      overall.totalRequests += r.totalRequests;
      overall.closedRequests += r.closedRequests;
      overall.activeRequests += r.activeRequests;
      overall.totalPlannedHours += r.totalPlannedHours;
    }

    overall.totalPlannedHours = Number(overall.totalPlannedHours.toFixed(2));

    return {
      period: {
        startDate,
        endDate,
      },
      filters: {
        siteId,
        minRequests,
      },
      overall,
      breakdown: rows,
    };
  }

  async getMaintenanceReport(params) {
    return this.getEquipmentLoadReport(params);
  }
}

export const reportService = new ReportService();
