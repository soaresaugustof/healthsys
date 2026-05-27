import http from 'k6/http';
import { check, sleep } from 'k6';

// Aumenta carga progressivamente até encontrar o limite do sistema
export const options = {
  stages: [
    { duration: '30s', target: 10  },
    { duration: '1m',  target: 50  },
    { duration: '1m',  target: 100 },
    { duration: '1m',  target: 150 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    http_req_duration: ['p(99)<5000'],  // 99% abaixo de 5s
    http_req_failed:   ['rate<0.10'],   // menos de 10% de erros
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

function login(email, password) {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, senha: password }), {
    headers: { 'Content-Type': 'application/json' },
  });
  return res.status === 200 ? res.json('token') : null;
}

export default function () {
  const token = login('admin@healthsys.com', 'admin123');
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  check(http.get(`${BASE_URL}/api/patients`, { headers }), {
    'GET /patients 200': (r) => r.status === 200,
  });

  check(http.get(`${BASE_URL}/api/triage`, { headers }), {
    'GET /triage 200': (r) => r.status === 200,
  });

  check(http.get(`${BASE_URL}/api/beds`, { headers }), {
    'GET /beds 200': (r) => r.status === 200,
  });

  sleep(0.5);
}
