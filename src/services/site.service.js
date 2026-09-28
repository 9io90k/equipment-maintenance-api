import { Site, Equipment, EquipmentPassport, MaintenanceRequest } from '../models/index.js';
import { NotFoundError } from '../errors/index.js';

export class SiteService {
  async getAll() {
    const sites = await Site.findAll({ order: [['name', 'ASC']] });
    return sites.map((s) => s.toJSON());
  }

  async getById(id) {
    const site = await Site.findByPk(id);
    if (!site) {
      throw new NotFoundError(`Площадка с ID "${id}" не найдена`);
    }
    return site.toJSON();
  }

  async getSummary(id) {
    const site = await this.getById(id);

    const equipmentList = await Equipment.findAll({
      where: { siteId: id },
      include: [
        { model: EquipmentPassport, as: 'passport' },
        { model: MaintenanceRequest, as: 'requests' },
      ],
    });

    const totalEquipment = equipmentList.length;

    const equipmentByStatus = {
      operational: 0,
      under_maintenance: 0,
      decommissioned: 0,
    };

    const equipmentByType = {};

    let totalNominalPower = 0;
    let activeRequestsCount = 0;

    for (const eq of equipmentList) {
      if (equipmentByStatus[eq.status] !== undefined) {
        equipmentByStatus[eq.status] += 1;
      }

      equipmentByType[eq.type] = (equipmentByType[eq.type] || 0) + 1;

      if (eq.passport?.nominalPower) {
        totalNominalPower += Number(eq.passport.nominalPower);
      }

      if (eq.requests && Array.isArray(eq.requests)) {
        const active = eq.requests.filter((r) => ['new', 'in_progress'].includes(r.status));
        activeRequestsCount += active.length;
      }
    }

    return {
      site,
      metrics: {
        totalEquipment,
        totalNominalPower: Number(totalNominalPower.toFixed(2)),
        activeRequestsCount,
        equipmentByStatus,
        equipmentByType,
      },
    };
  }
}

export const siteService = new SiteService();
