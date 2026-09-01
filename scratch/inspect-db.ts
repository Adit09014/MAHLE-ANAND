import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join("=").trim();
      }
    }
  }
}

import getPool from "../lib/mssql";

async function main() {
  try {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT DISTINCT Department FROM dbo.Employees ORDER BY Department
    `);
    console.log("=== ALL DEPARTMENTS IN SSMS ===");
    console.table(res.recordset);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

main();
