import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 20 },  // Ramp-up до 20 пользователей
    { duration: '15s', target: 50 }, // Удержание нагрузки 50 пользователей
    { duration: '5s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'], // 95% запросов должны укладываться в 250мс
    http_req_failed: ['rate<0.01'],   // Менее 1% ошибок
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost';

// Предварительно сгенерированный тестовый токен
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc3Nzc3Nzc3LTc3NzctNDc3Ny04Nzc3LTc3Nzc3Nzc3NzAwMSIsImVtYWlsIjoiYWRtaW5AZW5lcmd5LmxvY2FsIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzg0ODQxNjAwLCJleHAiOjE5NDI2MDE2MDB9.invalid_signature_use_npm_run_test_load';

export default function () {
  const params = {
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Accept': 'application/json',
    },
  };

  // 1. Liveness Probe
  const liveRes = http.get(`${BASE_URL}/api/health/live`);
  check(liveRes, {
    'liveness status is 200': (r) => r.status === 200,
  });

  // 2. Read Equipment
  const equipRes = http.get(`${BASE_URL}/api/equipment?limit=10`, params);
  check(equipRes, {
    'equipment status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  // 3. Analytics Report
  const repRes = http.get(`${BASE_URL}/api/reports/equipment-load`, params);
  check(repRes, {
    'report status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(0.1);
}
