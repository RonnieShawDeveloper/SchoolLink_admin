import mysql from 'mysql2/promise';

interface ScanRecord {
  student_id: string;
  mode_id: number;
  latest_scan: string;
}

interface StudentScansResponse {
  [studentId: string]: {
    gateIn?: string;
    gateOut?: string;
  };
}

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'schoollink.cmhy40ami38s.us-east-1.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'Flashuser10',
  database: process.env.DB_NAME || 'SchoolLink',
  ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false },
  charset: process.env.DB_CHARSET || 'utf8mb4',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Convert UTC timestamp to local 12-hour format
function formatTimeToLocal(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Lambda handler
export const handler = async (event: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const headers = {
    'Content-Type': 'application/json'
  };

  // Get HTTP method from Function URL event structure
  const httpMethod = event.requestContext?.http?.method || event.httpMethod || 'GET';

  // Handle preflight requests
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  try {
    // Parse request body
    let studentIds: string[] = [];

    if (httpMethod === 'POST' && event.body) {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      studentIds = body.studentIds || [];
    } else if (httpMethod === 'GET' && (event.queryStringParameters?.studentIds || event.rawQueryString)) {
      // Handle both API Gateway and Function URL query parameters
      if (event.queryStringParameters?.studentIds) {
        studentIds = event.queryStringParameters.studentIds.split(',');
      } else if (event.rawQueryString) {
        const urlParams = new URLSearchParams(event.rawQueryString);
        const studentIdsParam = urlParams.get('studentIds');
        if (studentIdsParam) {
          studentIds = studentIdsParam.split(',');
        }
      }
    }

    if (!studentIds || studentIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No student IDs provided',
          message: 'Please provide studentIds in request body (POST) or query parameters (GET)'
        })
      };
    }

    // Limit batch size to prevent timeout
    if (studentIds.length > 200) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Too many student IDs',
          message: 'Maximum 200 student IDs per request'
        })
      };
    }

    console.log(`Processing ${studentIds.length} student IDs:`, studentIds);

    // Create placeholders for the IN clause
    const placeholders = studentIds.map(() => '?').join(',');

    // Query to get the latest scans for today for each student and mode
    const query = `
      SELECT
        student_id,
        mode_id,
        MAX(scanned_at) as latest_scan
      FROM SchoolLink.scans
      WHERE DATE(scanned_at) = CURDATE()
        AND student_id IN (${placeholders})
        AND mode_id IN (1, 2)
      GROUP BY student_id, mode_id
      ORDER BY student_id, mode_id
    `;

    console.log('Executing query:', query);
    console.log('Query parameters:', studentIds);

    // Execute query
    const [rows] = await pool.execute(query, studentIds) as [ScanRecord[], any];

    console.log('Query results:', rows);

    // Process results into response format
    const response: StudentScansResponse = {};

    // Initialize all student IDs with empty scan data
    studentIds.forEach(id => {
      response[id] = {};
    });

    // Process scan records
    rows.forEach((row: ScanRecord) => {
      const studentId = row.student_id.toString();
      const formattedTime = formatTimeToLocal(row.latest_scan);

      if (row.mode_id === 1) {
        response[studentId].gateIn = formattedTime;
      } else if (row.mode_id === 2) {
        response[studentId].gateOut = formattedTime;
      }
    });

    console.log('Final response:', response);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: response,
        processedCount: studentIds.length,
        scansFound: rows.length
      })
    };

  } catch (error) {
    console.error('Error processing student scans:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    };
  }
};
