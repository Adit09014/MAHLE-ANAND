import sqlTedious from "mssql";

export const sql = sqlTedious;

declare global {
  // eslint-disable-next-line no-var
  var _mssqlPool: sqlTedious.ConnectionPool | undefined;
}

export async function getPool(): Promise<sqlTedious.ConnectionPool> {
  if (global._mssqlPool && global._mssqlPool.connected) {
    return global._mssqlPool;
  }

  const isTrusted = process.env.MSSQL_TRUSTED_CONNECTION === "true";
  const rawServer = (process.env.MSSQL_SERVER || "localhost").trim();
  const database = (process.env.MSSQL_DATABASE || "").trim();

  if (isTrusted) {
    // Windows Authentication via msnodesqlv8 native driver
    const sqlNativeModule = await import("mssql/msnodesqlv8.js");
    const sqlNative = sqlNativeModule.default || sqlNativeModule;

    const config = {
      driver: "msnodesqlv8",
      connectionString: `Driver={SQL Server};Server=${rawServer};Database=${database};Trusted_Connection=yes;`,
      parseJSON: true,
    } as unknown as sqlTedious.config;

    try {
      global._mssqlPool = await new sqlNative.ConnectionPool(config).connect();
      return global._mssqlPool!;
    } catch (primaryErr) {
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
          } as unknown as sqlTedious.config;
          global._mssqlPool = await new sqlNative.ConnectionPool(tryConfig).connect();
          return global._mssqlPool!;
        } catch {
          /* ignore fallback */
        }
      }
      throw primaryErr;
    }
  } else {
    // SQL Server Authentication via Tedious / TCP (Username + Password)
    const normalizedServer = rawServer.replace(/\\+/g, "\\");
    let serverHost = normalizedServer;
    let instanceName: string | undefined = undefined;

    if (normalizedServer.includes("\\")) {
      const parts = normalizedServer.split("\\").filter(Boolean);
      serverHost = parts[0] || "localhost";
      instanceName = parts[1] || undefined;
    }

    const user = (process.env.MSSQL_USER || "").trim().replace(/^["']|["']$/g, "");
    const password = (process.env.MSSQL_PASSWORD || "").trim().replace(/^["']|["']$/g, "");

    const config: sqlTedious.config = {
      server: serverHost,
      database,
      user,
      password,
      port: process.env.MSSQL_PORT ? parseInt(process.env.MSSQL_PORT, 10) : undefined,
      options: {
        encrypt: process.env.MSSQL_ENCRYPT === "true",
        trustServerCertificate: true,
        enableArithAbort: true,
        ...(instanceName ? { instanceName } : {}),
      },
    };

    try {
      global._mssqlPool = await new sqlTedious.ConnectionPool(config).connect();
      return global._mssqlPool!;
    } catch (err) {
      global._mssqlPool = undefined;
      throw err;
    }
  }
}

export default getPool;



