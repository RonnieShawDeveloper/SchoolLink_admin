import mysql from 'mysql2/promise';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
function isStudentsBySchoolRoute(path: string) { return path.endsWith('/students/by-school'); }
function isSchoolStatsRoute(path: string) { return path.endsWith('/students/school-stats'); }
function isStudentByIdRoute(path: string) { return path.match(/\/students\/\d+$/); }
function isUpdateRoute(path: string) { return path.endsWith('/students/update'); }
function isPhotoUploadRoute(path: string) { return path.endsWith('/photos/presigned-url'); }
function isScansTodayRoute(path: string) { return path.endsWith('/scans/today'); }

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

    if (isStudentsBySchoolRoute(route)) {
      if (method !== 'GET') return resp(405, { message: 'Method not allowed' });

      const institutionCode = qs.institutionCode;
      if (!institutionCode) {
        return resp(400, { message: 'institutionCode parameter is required' });
      }

      const [cntRows]: any = await pool.query(
        'SELECT COUNT(*) c FROM StudentData WHERE InstitutionCode = ?',
        [institutionCode]
      );
      const total = Number(cntRows?.[0]?.c || 0);

      const [rows]: any = await pool.query(
        `SELECT
          StudentID,
          StudentName,
          StudentOpenEMIS_ID,
          EducationGrade,
          Gender,
          InstitutionCode,
          InstitutionName
        FROM StudentData
        WHERE InstitutionCode = ?
        ORDER BY StudentName ASC`,
        [institutionCode]
      );

      return resp(200, { items: rows, total, page: 1, totalPages: 1 });
    }

    if (isSchoolStatsRoute(route)) {
      if (method !== 'GET') return resp(405, { message: 'Method not allowed' });

      const institutionCode = qs.institutionCode;
      if (!institutionCode) {
        return resp(400, { message: 'institutionCode parameter is required' });
      }

      // Get total count and gender breakdown in a single query
      const [statsRows]: any = await pool.query(
        `SELECT
          COUNT(*) as totalStudents,
          SUM(CASE WHEN UPPER(Gender) IN ('M', 'MALE') THEN 1 ELSE 0 END) as maleCount,
          SUM(CASE WHEN UPPER(Gender) IN ('F', 'FEMALE') THEN 1 ELSE 0 END) as femaleCount
        FROM StudentData
        WHERE InstitutionCode = ?`,
        [institutionCode]
      );

      const stats = statsRows?.[0] || {};
      const totalStudents = Number(stats.totalStudents || 0);
      const maleCount = Number(stats.maleCount || 0);
      const femaleCount = Number(stats.femaleCount || 0);

      return resp(200, {
        totalStudents,
        maleCount,
        femaleCount,
        institutionCode
      });
    }

    if (isStudentByIdRoute(route)) {
      if (method !== 'GET') return resp(405, { message: 'Method not allowed' });

      // Extract student ID from the route path
      const studentIdMatch = route.match(/\/students\/(\d+)$/);
      if (!studentIdMatch) {
        return resp(400, { message: 'Invalid student ID format' });
      }

      const studentId = parseInt(studentIdMatch[1]);
      const [rows]: any = await pool.query('SELECT * FROM StudentData WHERE StudentID = ? LIMIT 1', [studentId]);

      if (rows.length === 0) {
        return resp(404, { message: 'Student not found' });
      }

      return resp(200, { student: rows[0] });
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

    // Scans today route: GET or POST
    if (isScansTodayRoute(route)) {
      if (method !== 'GET' && method !== 'POST') {
        return resp(405, { message: 'Method not allowed' });
      }

      // Parse student_ids from POST JSON or GET query string
      let ids: (string | number)[] = [];
      try {
        if (method === 'POST') {
          const bodyRaw = event.body || '{}';
          const payload = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw;
          const arr = Array.isArray(payload?.student_ids) ? payload.student_ids : [];
          ids = arr
            .filter((v: any) => v !== null && v !== undefined)
            .map((v: any) => String(v).trim())
            .filter((s: string) => s.length > 0);
        } else {
          const qsIds = (qs.student_ids || '').trim();
          if (qsIds) ids = qsIds.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        }
      } catch (e: any) {
        return resp(400, { message: 'Invalid JSON body', error: String(e) });
      }

      if (!ids.length) {
        return resp(200, { items: [] });
      }

      // Query latest scans per student per mode for UTC "today".
      // Note: We DO NOT filter by school_id. Mode 1 (In), Mode 2 (Out).
      const numericIds = ids.map((x) => Number(x)).filter((n) => Number.isFinite(n));
      if (!numericIds.length) return resp(200, { items: [] });

      const sql = `
        SELECT
          s.student_id,
          MAX(CASE WHEN s.mode_id = 1 THEN s.scanned_at END) AS latestInAt,
          MAX(CASE WHEN s.mode_id = 2 THEN s.scanned_at END) AS latestOutAt
        FROM scans s
        WHERE s.mode_id IN (1,2)
          AND s.student_id IN (?)
          AND DATE(s.scanned_at) = UTC_DATE()
        GROUP BY s.student_id
      `;

      const [rows]: any = await pool.query(sql, [numericIds]);
      const items = (rows || []).map((r: any) => {
        const toIso = (ts?: string) => (ts ? new Date(ts + 'Z').toISOString() : undefined);
        return {
          student_id: r.student_id,
          latestInAt: toIso(r.latestInAt),
          latestOutAt: toIso(r.latestOutAt),
        };
      }).filter((it: any) => it.latestInAt || it.latestOutAt);

      return resp(200, { items });
    }

    if (isPhotoUploadRoute(route)) {
      if (method !== 'POST') return resp(405, { message: 'Method not allowed' });

      const bodyRaw = event.body || '{}';
      let payload: any;
      let photoBuffer: Buffer;

      // Handle both JSON and binary data
      if (event.isBase64Encoded) {
        // Binary data (photo upload)
        const studentOpenEmisId = event.queryStringParameters?.studentOpenEmisId;
        if (!studentOpenEmisId) {
          return resp(400, { message: 'studentOpenEmisId query parameter is required for binary upload' });
        }
        photoBuffer = Buffer.from(bodyRaw, 'base64');
        payload = { studentOpenEmisId };
      } else {
        // JSON data (requesting upload capability)
        payload = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw;
        if (!payload.studentOpenEmisId) {
          return resp(400, { message: 'studentOpenEmisId is required' });
        }

        // Return upload instructions for the frontend
        const bucketName = 'schoollink-student-photos';
        const key = `student-photos/${payload.studentOpenEmisId}.jpg`;
        return resp(200, {
          uploadUrl: `${event.requestContext?.http?.path || event.path}?studentOpenEmisId=${payload.studentOpenEmisId}`,
          key,
          bucket: bucketName,
          photoUrl: `https://${bucketName}.s3.amazonaws.com/${key}`,
          message: 'Send binary photo data to uploadUrl with Content-Type: image/jpeg'
        });
      }

      try {
        // Create S3 client
        const s3Client = new S3Client({
          region: 'us-east-1', // Same region as the bucket
        });

        const bucketName = 'schoollink-student-photos';
        const key = `student-photos/${payload.studentOpenEmisId}.jpg`;

        // Upload photo directly to S3 using Lambda's IAM permissions
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: photoBuffer,
          ContentType: 'image/jpeg',
        });

        await s3Client.send(command);

        return resp(200, {
          success: true,
          key,
          bucket: bucketName,
          photoUrl: `https://${bucketName}.s3.amazonaws.com/${key}`,
          message: 'Photo uploaded successfully'
        });
      } catch (error: any) {
        console.error('Error uploading photo to S3:', error);
        return resp(500, { message: 'Failed to upload photo', error: error.message });
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
