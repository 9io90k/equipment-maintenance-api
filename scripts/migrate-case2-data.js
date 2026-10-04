import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { sequelize } from '../src/lib/db.js';
import {
  Site,
  Equipment,
  EquipmentPassport,
  Technician,
  MaintenanceRequest,
  RequestAssignee,
  RequestStatusHistory,
} from '../src/models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_EQUIPMENT_JSON = path.resolve(__dirname, '../data/legacy/case2_equipment.json');
const DEFAULT_REQUESTS_JSON = path.resolve(__dirname, '../data/legacy/case2_requests.json');

/**
 * Migration ETL script: imports legacy Case 2 JSON file storage data
 * and normalizes it into PostgreSQL 3NF schema within an atomic transaction.
 */
export async function migrateLegacyData({
  equipmentPath = DEFAULT_EQUIPMENT_JSON,
  requestsPath = DEFAULT_REQUESTS_JSON,
} = {}) {
  console.log('--- Starting Case 2 -> Case 3 Legacy Data Migration ---');

  if (!fs.existsSync(equipmentPath) || !fs.existsSync(requestsPath)) {
    console.warn(`[ETL Warning] Source files not found at:\n  - ${equipmentPath}\n  - ${requestsPath}\nCreating sample legacy fixtures and proceeding...`);
    ensureLegacyFixtures(equipmentPath, requestsPath);
  }

  const legacyEquipment = JSON.parse(fs.readFileSync(equipmentPath, 'utf8'));
  const legacyRequests = JSON.parse(fs.readFileSync(requestsPath, 'utf8'));

  console.log(`[ETL Read] Loaded ${legacyEquipment.length} equipment items and ${legacyRequests.length} requests.`);

  const stats = {
    sitesCreated: 0,
    equipmentCreated: 0,
    passportsCreated: 0,
    techniciansCreated: 0,
    requestsCreated: 0,
    assigneesCreated: 0,
    historyCreated: 0,
  };

  await sequelize.transaction(async (t) => {
    // 1. Ensure default legacy site exists
    const [defaultSite] = await Site.findOrCreate({
      where: { code: 'LEGACY-SITE-01' },
      defaults: {
        id: randomUUID(),
        name: 'Основной производственный комплекс (Legacy Case 2)',
        code: 'LEGACY-SITE-01',
        region: 'Центральный ФО',
      },
      transaction: t,
    });
    stats.sitesCreated += 1;

    // 2. Migrate Equipment & Passports
    for (const item of legacyEquipment) {
      const existing = await Equipment.findOne({
        where: { serialNumber: item.serialNumber },
        transaction: t,
      });

      let equipId = existing ? existing.id : item.id || randomUUID();

      if (!existing) {
        await Equipment.create(
          {
            id: equipId,
            siteId: defaultSite.id,
            name: item.name,
            type: item.type,
            serialNumber: item.serialNumber,
            status: item.status || 'operational',
            location: item.location || { lat: 55.75, lon: 37.61 },
            installedAt: item.installedAt || new Date().toISOString(),
          },
          { transaction: t }
        );
        stats.equipmentCreated += 1;

        if (item.passport || item.manufacturer) {
          const pass = item.passport || {};
          await EquipmentPassport.create(
            {
              id: randomUUID(),
              equipmentId: equipId,
              manufacturer: pass.manufacturer || item.manufacturer || 'УралМаш',
              model: pass.model || item.model || 'М-2024',
              nominalPower: pass.nominalPower || item.nominalPower || 100,
              lastInspectionDate: pass.lastInspectionDate || item.lastInspectionDate || new Date().toISOString().split('T')[0],
            },
            { transaction: t }
          );
          stats.passportsCreated += 1;
        }
      }
    }

    // 3. Ensure default legacy technicians
    const defaultTechs = [
      { fullName: 'Иванов Иван Иванович', specialization: 'electrical', personnelNumber: 'TECH-LEGACY-01' },
      { fullName: 'Петров Петр Сергеевич', specialization: 'mechanical', personnelNumber: 'TECH-LEGACY-02' },
    ];

    const techRecords = [];
    for (const tech of defaultTechs) {
      const [techRecord, created] = await Technician.findOrCreate({
        where: { personnelNumber: tech.personnelNumber },
        defaults: { id: randomUUID(), ...tech },
        transaction: t,
      });
      techRecords.push(techRecord);
      if (created) stats.techniciansCreated += 1;
    }

    const leadTech = techRecords[0] || (await Technician.findOne({ transaction: t }));

    // 4. Migrate Maintenance Requests, Assignees, History
    for (const req of legacyRequests) {
      const existingReq = await MaintenanceRequest.findByPk(req.id, { transaction: t });
      if (!existingReq) {
        const targetEquipment = await Equipment.findOne({
          where: { serialNumber: req.equipmentSerialNumber || req.serialNumber || 'SN-TEST-001' },
          transaction: t,
        }) || (await Equipment.findOne({ transaction: t }));

        if (!targetEquipment) continue;

        const createdReq = await MaintenanceRequest.create(
          {
            id: req.id || randomUUID(),
            equipmentId: targetEquipment.id,
            title: req.title || 'Плановое ТО',
            description: req.description || '',
            priority: req.priority || 'medium',
            status: req.status || 'new',
            author: req.author || 'Legacy Case 2 Importer',
            plannedAt: req.plannedAt || null,
            closedAt: req.closedAt || (['done', 'rejected'].includes(req.status) ? new Date() : null),
            createdAt: req.createdAt || new Date().toISOString(),
          },
          { transaction: t }
        );
        stats.requestsCreated += 1;

        // Assign Lead technician if present in legacy
        if (leadTech) {
          await RequestAssignee.create(
            {
              requestId: createdReq.id,
              technicianId: leadTech.id,
              role: 'lead',
              hours: 4,
            },
            { transaction: t }
          );
          stats.assigneesCreated += 1;
        }

        // Initial status history entry
        await RequestStatusHistory.create(
          {
            id: randomUUID(),
            requestId: createdReq.id,
            previousStatus: null,
            newStatus: createdReq.status,
            changedBy: 'Legacy Migration ETL',
            comment: 'Миграция данных из файлового хранилища Case 2',
          },
          { transaction: t }
        );
        stats.historyCreated += 1;
      }
    }
  });

  console.log('--- Migration completed successfully! Stats: ---');
  console.table(stats);
  return stats;
}

function ensureLegacyFixtures(equipPath, reqPath) {
  const dir = path.dirname(equipPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const sampleEquipment = [
    {
      id: "99999999-9999-4999-8999-999999999001",
      name: "Legacy Ветрогенератор Case 2",
      type: "wind_turbine",
      serialNumber: "SN-LEGACY-001",
      status: "operational",
      location: { lat: 55.75, lon: 37.61 },
      installedAt: "2023-05-10T00:00:00.000Z",
      manufacturer: "Vestas Legacy",
      model: "V90-Legacy",
      nominalPower: 2000,
    }
  ];

  const sampleRequests = [
    {
      id: "99999999-9999-4999-8999-999999999002",
      equipmentSerialNumber: "SN-LEGACY-001",
      title: "Legacy Заявка на проверку лопастей",
      description: "Перенесено из JSON-хранилища Кейса 2",
      priority: "high",
      status: "in_progress",
      author: "диспетчер_legacy",
      plannedAt: "2024-03-01T10:00:00.000Z",
      createdAt: "2024-02-25T08:00:00.000Z"
    }
  ];

  fs.writeFileSync(equipPath, JSON.stringify(sampleEquipment, null, 2));
  fs.writeFileSync(reqPath, JSON.stringify(sampleRequests, null, 2));
}

// Auto-run when executed directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateLegacyData()
    .then(() => {
      console.log('ETL execution finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[ETL Fatal Error]:', err);
      process.exit(1);
    });
}
