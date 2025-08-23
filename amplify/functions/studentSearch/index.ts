import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

function getPoolCfg(): mysql.PoolOptions & { database: string } {
  const cfg: any = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: process.env.DB_CHARSET || 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
  if ((process.env.DB_SSL || 'true') === 'true') {
    // RDS public endpoints use certificates trusted by Node's default CAs.
    // Enforce TLS with certificate verification.
    cfg.ssl = { rejectUnauthorized: true };
  }
  return cfg;
}

async function getPool() {
  if (!pool) pool = mysql.createPool(getPoolCfg());
  return pool;
}

function parsePaging(limitStr?: string, pageStr?: string) {
  const limit = Math.min(50, Math.max(1, Number(limitStr) || 20));
  const page = Math.max(1, Number(pageStr) || 1);
  return { limit, page, offset: (page - 1) * limit };
}

function isSearchRoute(path: string) {
  return path.endsWith('/students/search');
}

function isInstitutionRoute(path: string) {
  return path.endsWith('/students/by-institution');
}

export const handler = async (event: any) => {
  try {
    const route = (event.requestContext?.http?.path || event.path || '').toLowerCase();
    const qs = event.queryStringParameters || {};
    const q = (qs.q || '').trim();
    const { limit, page, offset } = parsePaging(qs.limit, qs.page);

    if (!q) return resp(400, { message: 'q is required' });

    const pool = await getPool();

    if (isSearchRoute(route)) {
      // Try exact StudentOpenEMIS_ID first
      const [byIdRows] = await pool.query('SELECT * FROM StudentData WHERE StudentOpenEMIS_ID = ? LIMIT 1', [q]);
      const byId = byIdRows as any[];
      if (byId.length) {
        return resp(200, { items: byId, total: byId.length, page: 1, totalPages: 1 });
      }

      if (q.length < 3) return resp(400, { message: 'q must be at least 3 characters for partial search' });
      const like = `%${q}%`;

      const [cntRows]: any = await pool.query(
        'SELECT COUNT(*) c FROM StudentData WHERE StudentName LIKE ? OR MotherName LIKE ? OR FatherName LIKE ? OR GuardianName LIKE ?',
        [like, like, like, like]
      );
      const total = Number(cntRows?.[0]?.c || 0);

      const [rows]: any = await pool.query(
        'SELECT * FROM StudentData WHERE StudentName LIKE ? OR MotherName LIKE ? OR FatherName LIKE ? OR GuardianName LIKE ? ORDER BY StudentName ASC LIMIT ? OFFSET ?',
        [like, like, like, like, limit, offset]
      );
      return resp(200, { items: rows, total, page, totalPages: Math.ceil(total / limit) });
    }

    if (isInstitutionRoute(route)) {
      if (q.length < 3) return resp(400, { message: 'q must be at least 3 characters' });
      const like = `%${q}%`;

      const [cntRows]: any = await pool.query('SELECT COUNT(*) c FROM StudentData WHERE InstitutionName LIKE ?', [like]);
      const total = Number(cntRows?.[0]?.c || 0);

      const [rows]: any = await pool.query(
        'SELECT * FROM StudentData WHERE InstitutionName LIKE ? ORDER BY StudentName ASC LIMIT ? OFFSET ?',
        [like, limit, offset]
      );
      return resp(200, { items: rows, total, page, totalPages: Math.ceil(total / limit) });
    }

    return resp(404, { message: 'Route not found' });
  } catch (err: any) {
    console.error(err);
    return resp(500, { message: 'Internal error', error: String(err) });
  }
};

function resp(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
