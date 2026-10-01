import mysql from 'mysql2/promise';

const requiredEnvironment = ['DB_HOST', 'DB_USER', 'DB_NAME'];

export function getDatabase() {
  const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
  if (missingEnvironment.length) {
    throw new Error(`Missing database configuration: ${missingEnvironment.join(', ')}`);
  }

  if (!globalThis.mysqlPool) {
    globalThis.mysqlPool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    });
  }

  return globalThis.mysqlPool;
}