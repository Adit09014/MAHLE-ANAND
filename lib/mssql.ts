import sql from "mssql/msnodesqlv8";

const isTrusted = process.env.MSSQL_TRUSTED_CONNECTION === "true";
const rawServer = (process.env.MSSQL_SERVER || "localhost").trim();
const database = (process.env.MSSQL_DATABASE || "").trim();

let config: sql.config;

if (isTrusted) {
  // Windows Authentication via msnodesqlv8 native driver
  config = {
    driver: "msnodesqlv8",
    connectionString: `Driver={SQL Server};Server=${rawServer};Database=${database};Trusted_Connection=yes;`,
    parseJSON: true,
  } as unknown as sql.config;
} else {
  // SQL Server Authentication via Tedious / TCP
  let serverHost = rawServer;
  let instanceName: string | undefined = undefined;

  if (rawServer.includes("\\")) {
    const parts = rawServer.split("\\");
    serverHost = parts[0] || "localhost";
    instanceName = parts[1];
  }

  config = {
    server: serverHost,
    database,
    user: process.env.MSSQL_USER || undefined,
    password: process.env.MSSQL_PASSWORD || undefined,
    options: {
      encrypt: process.env.MSSQL_ENCRYPT === "true",
      trustServerCertificate: true,
      enableArithAbort: true,
      ...(instanceName ? { instanceName } : {}),
    },
  };
}

declare global {
  // eslint-disable-next-line no-var
  var _mssqlPool: sql.ConnectionPool | undefined;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mssqlPool || !global._mssqlPool.connected) {
      try {
        global._mssqlPool = await new sql.ConnectionPool(config).connect();
        return global._mssqlPool;
      } catch (primaryErr) {
        if (isTrusted) {
          const odbcDrivers = [
            "ODBC Driver 17 for SQL Server",
            "ODBC Driver 18 for SQL Server",
            "SQL Server Native Client 11.0",
          ];
          for (const driver of odbcDrivers) {
            try {
              const tryConfig = {
                driver: "msnodesqlv8",
                connectionString: `Driver={${driver}};Server=${rawServer};Database=${database};Trusted_Connection=yes;`,
                parseJSON: true,
              } as unknown as sql.config;
              global._mssqlPool = await new sql.ConnectionPool(tryConfig).connect();
              return global._mssqlPool;
            } catch {
              /* ignore fallback */
            }
          }
        }
        throw primaryErr;
      }
    }
    return global._mssqlPool;
  }

  return new sql.ConnectionPool(config).connect();
}

export default getPool;
export { sql };
