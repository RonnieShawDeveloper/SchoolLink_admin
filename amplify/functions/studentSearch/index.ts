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
    cfg.ssl = { rejectUnauthorized: false };
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

function isSearchRoute(path: string) { return path.endsWith('/students/search'); }
function isInstitutionRoute(path: string) { return path.endsWith('/students/by-institution'); }
function isCountRoute(path: string) { return path.endsWith('/students/count'); }
function isSchoolsRoute(path: string) { return path.endsWith('/schools/list'); }
function isUpdateRoute(path: string) { return path.endsWith('/students/update'); }

export const handler = async (event: any) => {
  try {
    const method = (event.requestContext?.http?.method || event.httpMethod || 'GET').toUpperCase();
    if (method === 'OPTIONS') {
      return resp(204, {});
    }

    const route = (event.requestContext?.http?.path || event.path || '').toLowerCase();
    const qs = event.queryStringParameters || {};
    const q = (qs.q || '').trim();
    const { limit, page, offset } = parsePaging(qs.limit, qs.page);

    const pool = await getPool();

    if (isSearchRoute(route)) {
      if (!q) return resp(400, { message: 'q is required' });
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
      if (!q || q.length < 3) return resp(400, { message: 'q must be at least 3 characters' });
      const like = `%${q}%`;

      const [cntRows]: any = await pool.query('SELECT COUNT(*) c FROM StudentData WHERE InstitutionName LIKE ?', [like]);
      const total = Number(cntRows?.[0]?.c || 0);

      const [rows]: any = await pool.query(
        'SELECT * FROM StudentData WHERE InstitutionName LIKE ? ORDER BY StudentName ASC LIMIT ? OFFSET ?',
        [like, limit, offset]
      );
      return resp(200, { items: rows, total, page, totalPages: Math.ceil(total / limit) });
    }

    if (isCountRoute(route)) {
      if (method !== 'GET') return resp(405, { message: 'Method not allowed' });

      const [cntRows]: any = await pool.query('SELECT COUNT(*) as totalRecords FROM StudentData');
      const totalRecords = Number(cntRows?.[0]?.totalRecords || 0);

      return resp(200, { totalRecords });
    }

    if (isSchoolsRoute(route)) {
      if (method !== 'GET') return resp(405, { message: 'Method not allowed' });

      const [rows]: any = await pool.query(`
        SELECT DISTINCT
          InstitutionCode,
          InstitutionName,
          Ownewship,
          Type,
          Sector,
          Provider,
          Locality,
          AreaEducationCode,
          AreaEducation,
          AreaAdministrativeCode,
          AreaAdministrative
        FROM StudentData
        WHERE InstitutionCode IS NOT NULL
          AND InstitutionCode != ''
          AND InstitutionName IS NOT NULL
          AND InstitutionName != ''
        ORDER BY InstitutionName ASC
      `);

      // Group by Institution Code to handle potential duplicates
      const schoolsMap = new Map();
      rows.forEach((row: any) => {
        if (!schoolsMap.has(row.InstitutionCode)) {
          schoolsMap.set(row.InstitutionCode, row);
        }
      });

      const schools = Array.from(schoolsMap.values());
      return resp(200, { schools });
    }

    if (isUpdateRoute(route)) {
      if (method !== 'POST') return resp(405, { message: 'Method not allowed' });
      const bodyRaw = event.body || '{}';
      const payload = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw;

      // Allowed columns based on StudentData schema
      const allowed = [
        'InstitutionCode','InstitutionName','Ownewship','Type','Sector','Provider','Locality','AreaEducationCode','AreaEducation','AreaAdministrativeCode','AreaAdministrative',
        'EducationGrade','AcademicPeriod','StartDate','EndDate','ClassName','LastGradeLevelEnrolled','PreviousSchool',
        'StudentOpenEMIS_ID','StudentName','StudentStatus','Gender','DateOfBirth','Age','PreferredNationality','AllNationalities','DefaultIdentitytype','IdentityNumber','RiskIndex','ExtraActivities','Address','NIB2',
        'MotherOpenEMIS_ID','MotherName','MotherContact','MotherFirstName','MotherLastName','MotherAddress','MotherTelephone','MotherEmail','MotherDOB','MotherIsDeceased','MotherNationality',
        'FatherOpenEMIS_ID','FatherName','FatherContact','FatherFirstName','FatherLastName','FatherAddress','FatherTelephone','FatherEmail','FatherDOB','FatherIsDeceased','FatherNationality',
        'GuardianOpenEMIS_ID','GuardianName','GuardianGender','GuardianDateOfBirth','GuardianFirstName','GuardianLastName','GuardianAddress','GuardianTelephone','GuardianEmail','GuardianDOB','GuardianIsDeceased','GuardianNationality',
        'Studentlivingwith','StudentLivingWithGuardian'
      ];

      const updates: string[] = [];
      const values: any[] = [];
      for (const k of allowed) {
        if (k in payload) {
          updates.push(`${k} = ?`);
          values.push(payload[k]);
        }
      }

      if (payload.StudentID) {
        const sql = `UPDATE StudentData SET ${updates.join(', ')} WHERE StudentID = ?`;
        values.push(payload.StudentID);
        const [res]: any = await pool.query(sql, values);
        return resp(200, { status: 'updated', affectedRows: res.affectedRows, StudentID: payload.StudentID });
      } else if (payload.StudentOpenEMIS_ID) {
        const [rows]: any = await pool.query('SELECT StudentID FROM StudentData WHERE StudentOpenEMIS_ID = ? LIMIT 1', [payload.StudentOpenEMIS_ID]);
        if (rows.length) {
          const sid = rows[0].StudentID;
          const sql = `UPDATE StudentData SET ${updates.join(', ')} WHERE StudentID = ?`;
          const vals = [...values, sid];
          const [res]: any = await pool.query(sql, vals);
          return resp(200, { status: 'updated', affectedRows: res.affectedRows, StudentID: sid });
        } else {
          // Insert
          const cols: string[] = [];
          const vals: any[] = [];
          const qms: string[] = [];
          for (const k of allowed) {
            if (k in payload) { cols.push(k); vals.push(payload[k]); qms.push('?'); }
          }
          if (cols.length === 0) return resp(400, { message: 'No fields provided to insert/update' });
          const sql = `INSERT INTO StudentData (${cols.join(',')}) VALUES (${qms.join(',')})`;
          const [res]: any = await pool.query(sql, vals);
          return resp(200, { status: 'inserted', insertId: res.insertId });
        }
      } else {
        return resp(400, { message: 'StudentID or StudentOpenEMIS_ID is required' });
      }
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
      'Content-Type': 'application/json'
      // Remove CORS headers - let Function URL handle CORS
    },
    body: statusCode === 204 ? '' : JSON.stringify(body),
  };
}
