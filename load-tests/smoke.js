import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 2,
  duration: '30s',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

function login(email, password) {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, senha: password }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'login OK': (r) => r.status === 200 });
  return res.status === 200 ? res.json('token') : null;
}

export default function () {
  // Login
  const token = login('admin@healthsys.com', 'admin123');
  if (!token) return;

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Pacientes
  check(http.get(`${BASE_URL}/api/patients`, { headers }), {
    'GET /patients OK': (r) => r.status === 200,
  });

  // Triagens
  check(http.get(`${BASE_URL}/api/triage`, { headers }), {
    'GET /triage OK': (r) => r.status === 200,
  });

  // Leitos
  check(http.get(`${BASE_URL}/api/beds`, { headers }), {
    'GET /beds OK': (r) => r.status === 200,
  });

  sleep(1);
}
