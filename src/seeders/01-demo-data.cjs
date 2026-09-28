'use strict';

const pastDate = (daysAgo) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
const futureDate = (daysAhead) => new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

const reqId = (n) => `44444444-4444-4444-8444-${String(n).padStart(12, '0')}`;
const asgId = (n) => `55555555-5555-4555-8555-${String(n).padStart(12, '0')}`;
const histId = (n) => `66666666-6666-4666-8666-${String(n).padStart(12, '0')}`;

const SITES = {
  north: '11111111-1111-4111-8111-111111111001',
  south: '11111111-1111-4111-8111-111111111002',
};

const EQ = {
  wt1: '22222222-2222-4222-8222-222222222001',
  wt2: '22222222-2222-4222-8222-222222222002',
  sp1: '22222222-2222-4222-8222-222222222003',
  sp2: '22222222-2222-4222-8222-222222222004',
  sub1: '22222222-2222-4222-8222-222222222005',
  inv1: '22222222-2222-4222-8222-222222222006',
};

const PASS = {
  p1: '22222222-2222-4222-8222-222222222101',
  p2: '22222222-2222-4222-8222-222222222102',
  p3: '22222222-2222-4222-8222-222222222103',
  p4: '22222222-2222-4222-8222-222222222104',
  p5: '22222222-2222-4222-8222-222222222105',
  p6: '22222222-2222-4222-8222-222222222106',
};

const TECHS = {
  ivanov: '33333333-3333-4333-8333-333333333001',
  petrov: '33333333-3333-4333-8333-333333333002',
  sidorov: '33333333-3333-4333-8333-333333333003',
  smirnov: '33333333-3333-4333-8333-333333333004',
  kuznetsov: '33333333-3333-4333-8333-333333333005',
};

// 1. Площадки (2 площадки)
const sitesData = [
  { id: SITES.north, name: 'Ветропарк Северный', code: 'SITE-WIND-01', region: 'Мурманская область', coordinates: JSON.stringify({ lat: 68.97, lng: 33.08 }), created_at: pastDate(120), updated_at: pastDate(120) },
  { id: SITES.south, name: 'Солнечная станция Южная', code: 'SITE-SOLAR-01', region: 'Астраханская область', coordinates: JSON.stringify({ lat: 46.35, lng: 48.04 }), created_at: pastDate(120), updated_at: pastDate(120) },
];

// 2. Оборудование (6 единиц)
const equipmentData = [
  { id: EQ.wt1, site_id: SITES.north, name: 'Ветрогенератор ВЭУ-01', type: 'wind_turbine', serial_number: 'WT-2023-001', status: 'operational', location: JSON.stringify({ sector: 'A', tower: 1 }), installed_at: pastDate(100), created_at: pastDate(100), updated_at: pastDate(10) },
  { id: EQ.wt2, site_id: SITES.north, name: 'Ветрогенератор ВЭУ-02', type: 'wind_turbine', serial_number: 'WT-2023-002', status: 'under_maintenance', location: JSON.stringify({ sector: 'A', tower: 2 }), installed_at: pastDate(95), created_at: pastDate(95), updated_at: pastDate(2) },
  { id: EQ.sp1, site_id: SITES.south, name: 'Солнечная батарея СБ-01', type: 'solar_panel', serial_number: 'SP-2023-101', status: 'operational', location: JSON.stringify({ row: 12, section: 4 }), installed_at: pastDate(90), created_at: pastDate(90), updated_at: pastDate(5) },
  { id: EQ.sp2, site_id: SITES.south, name: 'Солнечная батарея СБ-02', type: 'solar_panel', serial_number: 'SP-2023-102', status: 'operational', location: JSON.stringify({ row: 12, section: 5 }), installed_at: pastDate(85), created_at: pastDate(85), updated_at: pastDate(5) },
  { id: EQ.sub1, site_id: SITES.north, name: 'Трансформаторная подстанция ТП-110', type: 'substation', serial_number: 'SUB-2022-005', status: 'operational', location: JSON.stringify({ zone: 'Central' }), installed_at: pastDate(110), created_at: pastDate(110), updated_at: pastDate(15) },
  { id: EQ.inv1, site_id: SITES.south, name: 'Сетевой инвертор ИНВ-500', type: 'inverter', serial_number: 'INV-2024-501', status: 'operational', location: JSON.stringify({ block: 'B-3' }), installed_at: pastDate(80), created_at: pastDate(80), updated_at: pastDate(1) },
];

// 3. Технические паспорта (6 паспортов, связь 1:1)
const passportsData = [
  { id: PASS.p1, equipment_id: EQ.wt1, manufacturer: 'Vestas Wind Systems', model: 'V112-3.45 MW', nominal_power: 3450.00, last_inspection_date: '2025-05-10', created_at: pastDate(100), updated_at: pastDate(10) },
  { id: PASS.p2, equipment_id: EQ.wt2, manufacturer: 'Vestas Wind Systems', model: 'V112-3.45 MW', nominal_power: 3450.00, last_inspection_date: '2025-05-12', created_at: pastDate(95), updated_at: pastDate(2) },
  { id: PASS.p3, equipment_id: EQ.sp1, manufacturer: 'Hevel Solar', model: 'HJT-400 Bifacial', nominal_power: 400.00, last_inspection_date: '2025-06-01', created_at: pastDate(90), updated_at: pastDate(5) },
  { id: PASS.p4, equipment_id: EQ.sp2, manufacturer: 'Hevel Solar', model: 'HJT-400 Bifacial', nominal_power: 400.00, last_inspection_date: '2025-06-01', created_at: pastDate(85), updated_at: pastDate(5) },
  { id: PASS.p5, equipment_id: EQ.sub1, manufacturer: 'Siemens Energy', model: 'Geafol 110/10kV', nominal_power: 16000.00, last_inspection_date: '2025-04-20', created_at: pastDate(110), updated_at: pastDate(15) },
  { id: PASS.p6, equipment_id: EQ.inv1, manufacturer: 'SMA Solar Technology', model: 'Sunny Central 500CP', nominal_power: 500.00, last_inspection_date: '2025-07-15', created_at: pastDate(80), updated_at: pastDate(1) },
];

// 4. Техники (5 специалистов)
const techniciansData = [
  { id: TECHS.ivanov, full_name: 'Иванов Иван Иванович', specialization: 'Механика ветроустановок', personnel_number: 'TECH-001', created_at: pastDate(120), updated_at: pastDate(120) },
  { id: TECHS.petrov, full_name: 'Петров Петр Сергеевич', specialization: 'Высоковольтная электрика', personnel_number: 'TECH-002', created_at: pastDate(120), updated_at: pastDate(120) },
  { id: TECHS.sidorov, full_name: 'Сидоров Алексей Николаевич', specialization: 'АСУ ТП и телеметрия', personnel_number: 'TECH-003', created_at: pastDate(120), updated_at: pastDate(120) },
  { id: TECHS.smirnov, full_name: 'Смирнов Дмитрий Васильевич', specialization: 'Фотоэлектрические системы', personnel_number: 'TECH-004', created_at: pastDate(120), updated_at: pastDate(120) },
  { id: TECHS.kuznetsov, full_name: 'Кузнецов Михаил Павлович', specialization: 'Диагностика и вибромониторинг', personnel_number: 'TECH-005', created_at: pastDate(120), updated_at: pastDate(120) },
];

// 5. Заявки на ТО (20 заявок, фабрика)
const createRequest = ([num, eqId, title, desc, prio, status, author, planDays, closeDays, createDays]) => ({
  id: reqId(num),
  equipment_id: eqId,
  title,
  description: desc,
  priority: prio,
  status,
  author,
  planned_at: planDays === null ? null : (planDays > 0 ? futureDate(planDays) : pastDate(-planDays)),
  closed_at: closeDays === null ? null : pastDate(closeDays),
  created_at: pastDate(createDays),
  updated_at: pastDate(closeDays ?? Math.min(createDays, 1)),
});

const requestsData = [
  [1, EQ.wt1, 'Замена масла в главном редукторе ВЭУ-01', 'Плановая замена синтетического масла и фильтрующих элементов редуктора', 'medium', 'done', 'Диспетчер САПР', -25, 22, 30],
  [2, EQ.wt1, 'Инспекция аэродинамических тормозов лопастей', 'Проверка гидравлических приводов поворотного механизма', 'high', 'done', 'Система мониторинга', -15, 13, 18],
  [3, EQ.wt1, 'Плановая калибровка анемометра и флюгера', 'Сверка показаний метеодатчиков гондолы с эталонным переносным прибором', 'low', 'new', 'Инженер метеопоста', 5, null, 2],
  [4, EQ.wt1, 'Вибродиагностика коренных подшипников вала', 'Анализ спектра вибраций на номинальной скорости вращения 14 об/мин', 'medium', 'in_progress', 'Кузнецов М.П.', -1, null, 4],
  [5, EQ.wt1, 'Запрос на замену датчика температуры обмотки', 'Ложное сообщение о перегреве фазы B генератора', 'low', 'rejected', 'Автоматика SCADA', null, 12, 14],
  [6, EQ.wt2, 'Аварийная остановка: утечка гидравлической жидкости', 'Падение давления в гидростанции тормоза ротора ниже 120 бар', 'critical', 'in_progress', 'Система безопасности', -2, null, 3],
  [7, EQ.wt2, 'Замена концевых выключателей рыскания', 'Выработка ресурса датчиков углового положения гондолы', 'medium', 'done', 'Иванов И.И.', -40, 38, 42],
  [8, EQ.wt2, 'Подтяжка болтовых соединений фланцев башни', 'Контрольная затяжка динамометрическим гидроключом сегментов L1-L3', 'high', 'new', 'Главный механик', 7, null, 1],
  [9, EQ.wt2, 'Проверка цепей обогрева лопастей от обледенения', 'Тестирование термокабелей перед началом зимнего периода', 'medium', 'done', 'Диспетчер', -50, 48, 55],
  [10, EQ.sp1, 'Очистка поверхности фотомодулей от песчаных наносов', 'Снижение генерации на 18% из-за запыленности после песчаной бури', 'high', 'done', 'Диспетчер СЭС', -10, 9, 11],
  [11, EQ.sp1, 'Тепловизионное обследование стринг-цепей', 'Поиск локальных перегревов (hot-spots) защитных диодов', 'medium', 'in_progress', 'Смирнов Д.В.', -1, null, 3],
  [12, EQ.sp1, 'Проверка заземления опорных металлоконструкций', 'Замер сопротивления растеканию тока контура заземления секций 1-8', 'low', 'new', 'Энергонадзор', 12, null, 2],
  [13, EQ.sp2, 'Замена сгоревшего плавкого предохранителя DC-стринга', 'Срабатывание защиты по постоянному току в блоке коммутации №4', 'high', 'done', 'Телеметрия СЭС', -20, 19, 21],
  [14, EQ.sp2, 'Ревизия кабельных трасс постоянного тока', 'Проверка изоляции кабелей Solar Cable 6mm2 на стойкость к УФ', 'medium', 'in_progress', 'Петров П.С.', -2, null, 5],
  [15, EQ.sp2, 'Внеочередная модернизация креплений трекеров', 'Запрос на усиление кронштейнов. Отклонено из-за несоответствия проекту', 'low', 'rejected', 'Подрядчик монтажа', null, 25, 28],
  [16, EQ.sub1, 'Хроматографический анализ газов трансформаторного масла', 'Лабораторный отбор проб масла из бака главного трансформатора ТП-110', 'critical', 'in_progress', 'Главный энергетик', -1, null, 3],
  [17, EQ.sub1, 'Проверка микропроцессорной релейной защиты БМРЗ', 'Тестирование уставок МТЗ и дифференциальной защиты отсечки', 'high', 'done', 'Сидоров А.Н.', -35, 33, 37],
  [18, EQ.sub1, 'Ревизия элегазовых выключателей 110 кВ', 'Контроль давления элегаза SF6 и проверка контактов привода', 'medium', 'new', 'Служба эксплуатации', 14, null, 1],
  [19, EQ.inv1, 'Обновление прошивки микроконтроллера MPPT', 'Установка версии v4.2.1 с улучшенным алгоритмом отслеживания точки ТММ', 'medium', 'done', 'Сидоров А.Н.', -8, 7, 10],
  [20, EQ.inv1, 'Замена воздушных фильтров принудительного охлаждения', 'Предупреждение о росте внутренней температуры силового IGBT-модуля', 'high', 'new', 'Телеметрия инвертора', 3, null, 1],
].map(createRequest);

// 6. Назначения исполнителей (19 назначений, фабрика)
const createAssignee = ([num, reqNum, techId, role, hours, daysAgo]) => ({
  id: asgId(num),
  request_id: reqId(reqNum),
  technician_id: techId,
  role,
  hours,
  created_at: pastDate(daysAgo),
  updated_at: pastDate(daysAgo),
});

const assigneesData = [
  [1, 1, TECHS.ivanov, 'lead', 10.0, 22],
  [2, 1, TECHS.sidorov, 'member', 6.0, 22],
  [3, 2, TECHS.ivanov, 'lead', 14.5, 13],
  [4, 4, TECHS.kuznetsov, 'lead', 8.0, 1],
  [5, 4, TECHS.ivanov, 'member', 4.0, 1],
  [6, 6, TECHS.ivanov, 'lead', 16.0, 1],
  [7, 6, TECHS.petrov, 'member', 12.0, 1],
  [8, 7, TECHS.ivanov, 'lead', 12.0, 38],
  [9, 9, TECHS.petrov, 'lead', 18.0, 48],
  [10, 10, TECHS.smirnov, 'lead', 8.5, 9],
  [11, 11, TECHS.smirnov, 'lead', 6.0, 1],
  [12, 11, TECHS.kuznetsov, 'member', 5.0, 1],
  [13, 13, TECHS.smirnov, 'lead', 4.0, 19],
  [14, 14, TECHS.petrov, 'lead', 7.5, 2],
  [15, 16, TECHS.petrov, 'lead', 9.0, 1],
  [16, 16, TECHS.sidorov, 'member', 5.0, 1],
  [17, 17, TECHS.sidorov, 'lead', 15.0, 33],
  [18, 17, TECHS.petrov, 'member', 10.0, 33],
  [19, 19, TECHS.sidorov, 'lead', 6.5, 7],
].map(createAssignee);

// 7. История статусов (28 записей, фабрика)
const createHistory = ([num, reqNum, prevStatus, newStatus, author, comment, daysAgo]) => ({
  id: histId(num),
  request_id: reqId(reqNum),
  previous_status: prevStatus,
  new_status: newStatus,
  changed_by: author,
  comment,
  created_at: pastDate(daysAgo),
});

const historyData = [
  [1, 1, null, 'new', 'Диспетчер САПР', 'Заявка сформирована согласно графику планового ТО', 30],
  [2, 1, 'new', 'in_progress', 'Иванов И.И.', 'Получены материалы и допуск к электроустановкам', 25],
  [3, 1, 'in_progress', 'done', 'Иванов И.И.', 'Замена масла выполнена, редуктор опломбирован', 22],
  [4, 2, null, 'new', 'Система мониторинга', 'Автоматическая регистрация по наработке часов', 18],
  [5, 2, 'new', 'in_progress', 'Иванов И.И.', 'Бригада приступила к подъему на гондолу', 15],
  [6, 2, 'in_progress', 'done', 'Иванов И.И.', 'Тормозные цилиндры отрегулированы', 13],
  [7, 3, null, 'new', 'Инженер метеопоста', 'Запланирована поверка датчиков', 2],
  [8, 4, null, 'new', 'Кузнецов М.П.', 'Обнаружен повышенный уровень шума', 4],
  [9, 4, 'new', 'in_progress', 'Кузнецов М.П.', 'Установка датчиков виброускорения на корпус генератора', 1],
  [10, 5, null, 'new', 'Автоматика SCADA', 'Триггер температуры', 14],
  [11, 5, 'new', 'rejected', 'Главный инженер', 'Отклонено: температура в пределах нормы (55°C)', 12],
  [12, 6, null, 'new', 'Система безопасности', 'Аварийный триггер: давление P < 120 bar', 3],
  [13, 6, 'new', 'in_progress', 'Иванов И.И.', 'Аварийный выезд. Локализована утечка штуцера', 1],
  [14, 7, null, 'new', 'Иванов И.И.', 'Замена датчиков по регламенту', 42],
  [15, 7, 'new', 'done', 'Иванов И.И.', 'Датчики заменены и протестированы', 38],
  [16, 10, null, 'new', 'Диспетчер СЭС', 'Снижение генерации после пыльной бури', 11],
  [17, 10, 'new', 'done', 'Смирнов Д.В.', 'Модули промыты деминерализованной водой', 9],
  [18, 11, null, 'new', 'Смирнов Д.В.', 'Плановый тепловизионный контроль', 3],
  [19, 11, 'new', 'in_progress', 'Смирнов Д.В.', 'Анализ термограмм с квадрокоптера', 1],
  [20, 15, null, 'new', 'Подрядчик монтажа', 'Предложение по усилению кронштейнов', 28],
  [21, 15, 'new', 'rejected', 'Технический директор', 'Отклонено: конструкции соответствуют нормам региона IV', 25],
  [22, 16, null, 'new', 'Главный энергетик', 'Контрольный отбор проб масла', 3],
  [23, 16, 'new', 'in_progress', 'Петров П.С.', 'Пробы переданы в химическую лабораторию', 1],
  [24, 17, null, 'new', 'Сидоров А.Н.', 'Поверка релейной защиты БМРЗ', 37],
  [25, 17, 'new', 'done', 'Сидоров А.Н.', 'Уставки проверены установкой РЕТОМ-21', 33],
  [26, 19, null, 'new', 'Сидоров А.Н.', 'Вышла новая сервисная прошивка инвертора', 10],
  [27, 19, 'new', 'done', 'Сидоров А.Н.', 'Прошивка успешно обновлена по RS-485 Modbus', 7],
  [28, 20, null, 'new', 'Телеметрия инвертора', 'Предупреждение: температура силового блока приближается к 65°C', 1],
].map(createHistory);

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('sites', sitesData);
    await queryInterface.bulkInsert('equipment', equipmentData);
    await queryInterface.bulkInsert('equipment_passports', passportsData);
    await queryInterface.bulkInsert('technicians', techniciansData);
    await queryInterface.bulkInsert('maintenance_requests', requestsData);
    await queryInterface.bulkInsert('request_assignees', assigneesData);
    await queryInterface.bulkInsert('request_status_history', historyData);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('request_status_history', null, {});
    await queryInterface.bulkDelete('request_assignees', null, {});
    await queryInterface.bulkDelete('maintenance_requests', null, {});
    await queryInterface.bulkDelete('technicians', null, {});
    await queryInterface.bulkDelete('equipment_passports', null, {});
    await queryInterface.bulkDelete('equipment', null, {});
    await queryInterface.bulkDelete('sites', null, {});
  },
};