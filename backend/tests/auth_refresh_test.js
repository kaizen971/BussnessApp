/**
 * Tests du flux d'expiration / rafraîchissement JWT
 * Usage : node tests/auth_refresh_test.js
 *
 * Couvre :
 *  - middleware : TOKEN_EXPIRED vs TOKEN_INVALID
 *  - POST /auth/refresh avec token valide, expiré (dans la grâce), hors grâce, invalide
 *  - retry silencieux : une requête protégée avec token expiré peut être rafraîchie
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const http = require('http');

const JWT_SECRET = 'test_secret_auth_refresh';
const TOKEN_REFRESH_GRACE_SECONDS = 30 * 24 * 60 * 60;
const PORT = 34567;

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  username: 'vaneck',
  role: 'responsable',
  projectId: '507f1f77bcf86cd799439022',
  isActive: true,
  password: 'hashed',
  toObject() {
    const { password, ...rest } = this;
    return { ...rest };
  },
};

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required', code: 'NO_TOKEN' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
    }
    req.user = user;
    next();
  });
}

function buildApp() {
  const app = express();
  app.use(express.json());

  app.get('/BussnessApp/auth/me', authenticateToken, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username });
  });

  app.post('/BussnessApp/auth/refresh', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required', code: 'NO_TOKEN' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    } catch (err) {
      return res.status(403).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
    }

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && (now - decoded.exp) > TOKEN_REFRESH_GRACE_SECONDS) {
      return res.status(403).json({
        error: 'Token expired beyond grace period',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (String(decoded.id) !== String(mockUser._id)) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    if (!mockUser.isActive) {
      return res.status(403).json({ error: 'Compte désactivé', code: 'ACCOUNT_DISABLED' });
    }

    const newToken = jwt.sign(
      { id: mockUser._id, username: mockUser.username, role: mockUser.role, projectId: mockUser.projectId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userResponse = mockUser.toObject();
    res.json({ user: userResponse, token: newToken });
  });

  return app;
}

function request(method, path, token = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function signToken(payload, options) {
  return jwt.sign(payload, JWT_SECRET, options);
}

function makePayload() {
  return {
    id: mockUser._id,
    username: mockUser.username,
    role: mockUser.role,
    projectId: mockUser.projectId,
  };
}

async function run() {
  const app = buildApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '127.0.0.1', () => resolve(s));
  });

  let passed = 0;
  let failed = 0;

  const assert = (name, condition, detail = '') => {
    if (condition) {
      console.log(`✅ ${name}`);
      passed += 1;
    } else {
      console.log(`❌ ${name}${detail ? ' — ' + detail : ''}`);
      failed += 1;
    }
  };

  try {
    console.log('\n=== Auth refresh / expiration tests ===\n');

    // 1. Token valide → /me OK
    const validToken = signToken(makePayload(), { expiresIn: '1h' });
    const meOk = await request('GET', '/BussnessApp/auth/me', validToken);
    assert('Token valide : /auth/me → 200', meOk.status === 200, `got ${meOk.status}`);

    // 2. Token expiré → TOKEN_EXPIRED
    const expiredToken = signToken(makePayload(), { expiresIn: '-10s' });
    const meExpired = await request('GET', '/BussnessApp/auth/me', expiredToken);
    assert(
      'Token expiré : /auth/me → 403 TOKEN_EXPIRED',
      meExpired.status === 403 && meExpired.body.code === 'TOKEN_EXPIRED',
      JSON.stringify(meExpired.body)
    );

    // 3. Token bidon → TOKEN_INVALID
    const meInvalid = await request('GET', '/BussnessApp/auth/me', 'not.a.jwt');
    assert(
      'Token invalide : /auth/me → 403 TOKEN_INVALID',
      meInvalid.status === 403 && meInvalid.body.code === 'TOKEN_INVALID',
      JSON.stringify(meInvalid.body)
    );

    // 4. Sans token → NO_TOKEN
    const meNoToken = await request('GET', '/BussnessApp/auth/me');
    assert(
      'Sans token : /auth/me → 401 NO_TOKEN',
      meNoToken.status === 401 && meNoToken.body.code === 'NO_TOKEN',
      JSON.stringify(meNoToken.body)
    );

    // 5. Refresh avec token encore valide
    const refreshValid = await request('POST', '/BussnessApp/auth/refresh', validToken);
    assert(
      'Refresh token valide → 200 + nouveau token',
      refreshValid.status === 200 && !!refreshValid.body.token && !!refreshValid.body.user,
      JSON.stringify(refreshValid.body)
    );

    // 6. Refresh avec token expiré (dans la grâce)
    const refreshExpired = await request('POST', '/BussnessApp/auth/refresh', expiredToken);
    assert(
      'Refresh token expiré (dans grâce) → 200 + nouveau token',
      refreshExpired.status === 200 && !!refreshExpired.body.token,
      JSON.stringify(refreshExpired.body)
    );

    // 7. Nouveau token fonctionne sur /me
    const meAfterRefresh = await request('GET', '/BussnessApp/auth/me', refreshExpired.body.token);
    assert(
      'Nouveau token après refresh → /auth/me 200',
      meAfterRefresh.status === 200,
      `got ${meAfterRefresh.status}`
    );

    // 8. Token hors période de grâce
    const now = Math.floor(Date.now() / 1000);
    const beyondGrace = jwt.sign(
      {
        ...makePayload(),
        iat: now - TOKEN_REFRESH_GRACE_SECONDS - 7200,
        exp: now - TOKEN_REFRESH_GRACE_SECONDS - 3600,
      },
      JWT_SECRET
    );
    const refreshTooOld = await request('POST', '/BussnessApp/auth/refresh', beyondGrace);
    assert(
      'Refresh hors grâce → 403 TOKEN_EXPIRED',
      refreshTooOld.status === 403 && refreshTooOld.body.code === 'TOKEN_EXPIRED',
      JSON.stringify(refreshTooOld.body)
    );

    // 9. Simulation du client : token expiré → refresh → retry /me
    const first = await request('GET', '/BussnessApp/auth/me', expiredToken);
    assert('Client step1: requête échoue avec TOKEN_EXPIRED', first.body.code === 'TOKEN_EXPIRED');
    const second = await request('POST', '/BussnessApp/auth/refresh', expiredToken);
    assert('Client step2: refresh réussit', second.status === 200 && !!second.body.token);
    const third = await request('GET', '/BussnessApp/auth/me', second.body.token);
    assert('Client step3: retry /me réussit', third.status === 200);

    // 10. Compte désactivé
    mockUser.isActive = false;
    const refreshDisabled = await request('POST', '/BussnessApp/auth/refresh', validToken);
    assert(
      'Compte désactivé → 403 ACCOUNT_DISABLED',
      refreshDisabled.status === 403 && refreshDisabled.body.code === 'ACCOUNT_DISABLED',
      JSON.stringify(refreshDisabled.body)
    );
    mockUser.isActive = true;

    console.log(`\nRésultat : ${passed} passed, ${failed} failed\n`);
    process.exitCode = failed > 0 ? 1 : 0;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
