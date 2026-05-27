import http from 'k6/http';
import { check, sleep } from 'k6';

// Simula carga normal: rampa até 30 usuários, mantém por 2min, depois desce
export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '2m',  target: 30 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% das requisições abaixo de 2s
    http_req_failed:   ['rate<0.05'],   // menos de 5% de erros
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
  const users = [
    { email: 'admin@healthsys.com',       senha: 'admin123'       },
    { email: 'medico@healthsys.com',      senha: 'medico123'      },
    { email: 'enfermeiro@healthsys.com',  senha: 'enfermeiro123'  },
  ];

  const user = users[Math.floor(Math.random() * users.length)];
  const token = login(user.email, user.senha);
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Fluxo típico de uso
  check(http.get(`${BASE_URL}/api/patients`, { headers }), {
    'GET /patients 200': (r) => r.status === 200,
  });

  check(http.get(`${BASE_URL}/api/triage`, { headers }), {
    'GET /triage 200': (r) => r.status === 200,
  });

  check(http.get(`${BASE_URL}/api/beds`, { headers }), {
    'GET /beds 200': (r) => r.status === 200,
  });

  check(http.get(`${BASE_URL}/api/records`, { headers }), {
    'GET /records 200': (r) => r.status === 200,
  });

  check(http.get(`${BASE_URL}/api/notifications`, { headers }), {
    'GET /notifications 200': (r) => r.status === 200,
  });

  sleep(1);
}
