import sql from "mssql";

const isTrusted = process.env.MSSQL_TRUSTED_CONNECTION === "true";

const config: sql.config = {
  server: process.env.MSSQL_SERVER || "",
  database: process.env.MSSQL_DATABASE || "",
  user: isTrusted ? undefined : (process.env.MSSQL_USER || ""),
  password: isTrusted ? undefined : (process.env.MSSQL_PASSWORD || ""),
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === "true", // true for Azure SQL
    trustServerCertificate: true,                  // allow self-signed certs on local SSMS
    enableArithAbort: true,
    trustedConnection: isTrusted,                  // Windows Authentication
  },
};

// Singleton pool for development hot-reload safety
declare global {
  // eslint-disable-next-line no-var
  var _mssqlPool: sql.ConnectionPool | undefined;
}

async function getPool(): Promise<sql.ConnectionPool> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mssqlPool || !global._mssqlPool.connected) {
      global._mssqlPool = await new sql.ConnectionPool(config).connect();
    }
    return global._mssqlPool;
  }
  // Production: fresh pool per cold start
  return new sql.ConnectionPool(config).connect();
}

export default getPool;
export { sql };
