import autocannon from 'autocannon';
import { signAccessToken } from '../src/lib/jwt.js';

const TARGET_URL = process.env.TARGET_URL || 'http://localhost';
const DURATION_SEC = Number(process.env.LOAD_DURATION || 10);

const testAdminToken = signAccessToken({
  id: '77777777-7777-4777-8777-777777777001',
  email: 'admin@energy.local',
  role: 'admin',
});

const formatResult = (name, result) => {
  console.log(`\n======================================================`);
  console.log(`Результаты сценария: ${name}`);
  console.log(`======================================================`);
  console.log(`URL:                 ${result.url}`);
  console.log(`Длительность:        ${result.duration} сек`);
  console.log(`Параллельных связей: ${result.connections}`);
  console.log(`Всего запросов:      ${result.requests.total}`);
  console.log(`RPS (ср. пропускная):${result.requests.average.toFixed(1)} req/s`);
  console.log(`Трафик:              ${(result.throughput.total / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Ошибок (2xx != res): ${result.non2xx || 0}`);
  console.log(`Ошибок соединения:   ${result.errors || 0}`);
  console.log(`Таймаутов:           ${result.timeouts || 0}`);
  console.log(`------------------------------------------------------`);
  console.log(`Задержка (Latency):`);
  console.log(`  p50 (медиана):     ${result.latency.p50} ms`);
  console.log(`  p90:               ${result.latency.p90} ms`);
  console.log(`  p99:               ${result.latency.p99} ms`);
  console.log(`  Max:               ${result.latency.max} ms`);
  console.log(`======================================================\n`);
};

async function runScenario(options, name) {
  console.log(`\n[START] Запуск сценария "${name}" (${options.duration}s, ${options.connections} connections)...`);
  return new Promise((resolve, reject) => {
    autocannon(options, (err, result) => {
      if (err) return reject(err);
      formatResult(name, result);
      resolve(result);
    });
  });
}

async function main() {
  console.log(`\n=== Нагрузочное тестирование Equipment Maintenance API ===`);
  console.log(`Целевой хост: ${TARGET_URL}`);
  console.log(`Длительность теста: ${DURATION_SEC} сек`);

  try {
    // 1. Сценарий: Проверка работоспособности (Liveness Probe, Nginx Reverse Proxy)
    await runScenario(
      {
        url: `${TARGET_URL}/api/health/live`,
        connections: 50,
        duration: DURATION_SEC,
        headers: {
          'Accept': 'application/json',
        },
      },
      '1. Liveness Probe (Nginx Overhead & Event Loop)'
    );

    // 2. Сценарий: Аутентифицированное чтение списка оборудования (CRUD Read + DB Pool)
    await runScenario(
      {
        url: `${TARGET_URL}/api/equipment?limit=10`,
        connections: 20,
        duration: DURATION_SEC,
        headers: {
          'Authorization': `Bearer ${testAdminToken}`,
          'Accept': 'application/json',
        },
      },
      '2. Authenticated Read Equipment (PostgreSQL Connection Pool & Index Scan)'
    );

    // 3. Сценарий: Тяжелый аналитический отчет (Raw SQL Group By & Having)
    await runScenario(
      {
        url: `${TARGET_URL}/api/reports/equipment-load`,
        connections: 10,
        duration: DURATION_SEC,
        headers: {
          'Authorization': `Bearer ${testAdminToken}`,
          'Accept': 'application/json',
        },
      },
      '3. Complex Analytical Report (PostgreSQL Raw SQL Aggregations)'
    );

    console.log(`\n[SUCCESS] Все сценарии нагрузочного тестирования завершены.`);
    console.log(`Метрики доступны на дашборде Grafana (http://localhost:3001).`);
  } catch (error) {
    console.error('[ERROR] Ошибка во время выполнения нагрузочного теста:', error);
    process.exit(1);
  }
}

main();
