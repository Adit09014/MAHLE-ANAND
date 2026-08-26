import sql from "mssql";

const isTrusted = process.env.MSSQL_TRUSTED_CONNECTION === "true";
const rawServer = (process.env.MSSQL_SERVER || "localhost").trim();

let serverHost = rawServer;
let instanceName: string | undefined = undefined;

// Automatically split named instances like "INGG-MARUTIAPP\SQLEXPRESS"
if (rawServer.includes("\\")) {
  const parts = rawServer.split("\\");
  serverHost = parts[0] || "localhost";
  instanceName = parts[1];
} else if (rawServer.includes("/")) {
  const parts = rawServer.split("/");
  serverHost = parts[0] || "localhost";
  instanceName = parts[1];
}

const config: sql.config = {
  server: serverHost,
  database: process.env.MSSQL_DATABASE || "",
  user: isTrusted ? undefined : (process.env.MSSQL_USER || undefined),
  password: isTrusted ? undefined : (process.env.MSSQL_PASSWORD || undefined),
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === "true", // true for Azure SQL
    trustServerCertificate: true,                  // allow self-signed certs on local SSMS
    enableArithAbort: true,
    trustedConnection: isTrusted,                  // Windows Authentication
    ...(instanceName ? { instanceName } : {}),     // Correctly pass named instance (e.g. SQLEXPRESS)
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
      try {
        global._mssqlPool = await new sql.ConnectionPool(config).connect();
      } catch (err: unknown) {
        // If connecting via hostname fails and hostname is local machine, try localhost fallback
        if (serverHost !== "localhost" && serverHost !== "127.0.0.1") {
          const fallbackConfig: sql.config = {
            ...config,
            server: "localhost",
          };
          try {
            global._mssqlPool = await new sql.ConnectionPool(fallbackConfig).connect();
            return global._mssqlPool;
          } catch {
            // throw original error if fallback also fails
          }
        }
        throw err;
      }
    }
    return global._mssqlPool;
  }

  return new sql.ConnectionPool(config).connect();
}

export default getPool;
export { sql };
