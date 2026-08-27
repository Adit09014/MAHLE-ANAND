import { getPool } from "../lib/mssql.ts";

console.log("Testing SQL Server connection...");
try {
  const pool = await getPool();
  const res = await pool.request().query("SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName, COUNT(*) AS EmpCount FROM dbo.Employees");
  console.log("✅ SUCCESS! Connected to SQL Server:", res.recordset[0]);
  process.exit(0);
} catch (err) {
  console.error("❌ ERROR:", err.message);
  process.exit(1);
}
