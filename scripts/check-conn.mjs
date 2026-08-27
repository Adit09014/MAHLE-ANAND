import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sql from "mssql";

// Load .env.local / .env variables when script is run directly
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [
  path.join(__dirname, "..", ".env.local"),
  path.join(__dirname, "..", ".env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    for (const line of envConfig.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...vals] = trimmed.split("=");
        const val = vals.join("=").trim().replace(/^["']|["']$/g, "");
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
}

const isTrusted = process.env.MSSQL_TRUSTED_CONNECTION === "true";
const rawServer = (process.env.MSSQL_SERVER || "localhost").trim();
const database = (process.env.MSSQL_DATABASE || "").trim();
const tableName = process.env.MSSQL_TABLE || "dbo.Employees";

console.log("--------------------------------------------------");
console.log("🔍 Testing SQL Server connection...");
console.log(`Server:             ${rawServer}`);
console.log(`Database:           ${database}`);
console.log(`Trusted Connection: ${isTrusted}`);
console.log(`User:               ${process.env.MSSQL_USER || "(not set)"}`);
console.log("--------------------------------------------------");

async function testConnection() {
  let pool;
  try {
    if (isTrusted) {
      const sqlNativeModule = await import("mssql/msnodesqlv8.js");
      const sqlNative = sqlNativeModule.default || sqlNativeModule;
      const config = {
        driver: "msnodesqlv8",
        connectionString: `Driver={SQL Server};Server=${rawServer};Database=${database};Trusted_Connection=yes;`,
        parseJSON: true,
      };
      pool = await new sqlNative.ConnectionPool(config).connect();
    } else {
      let serverHost = rawServer;
      let instanceName = undefined;
      if (rawServer.includes("\\")) {
        const parts = rawServer.split("\\");
        serverHost = parts[0] || "localhost";
        instanceName = parts[1];
      }

      const config = {
        server: serverHost,
        database,
        user: process.env.MSSQL_USER || "",
        password: process.env.MSSQL_PASSWORD || "",
        port: process.env.MSSQL_PORT ? parseInt(process.env.MSSQL_PORT, 10) : undefined,
        options: {
          encrypt: process.env.MSSQL_ENCRYPT === "true",
          trustServerCertificate: true,
          enableArithAbort: true,
          ...(instanceName ? { instanceName } : {}),
        },
      };
      pool = await new sql.ConnectionPool(config).connect();
    }

    const res = await pool.request().query(`SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName, COUNT(*) AS EmpCount FROM ${tableName}`);
    console.log("✅ SUCCESS! Connected to SQL Server:", res.recordset[0]);
    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ ERROR connecting to SQL Server:", err.message);
    if (pool) await pool.close();
    process.exit(1);
  }
}

testConnection();


