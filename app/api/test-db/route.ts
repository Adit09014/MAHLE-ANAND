import { NextResponse } from "next/server";
import getPool, { sql } from "@/lib/mssql";

// GET /api/test-db
// Use this in the browser to diagnose SQL Server connection issues.
// Remove this file once the connection is working.
export async function GET() {
  const results: Record<string, string> = {
    MSSQL_SERVER: process.env.MSSQL_SERVER || "(not set)",
    MSSQL_DATABASE: process.env.MSSQL_DATABASE || "(not set)",
    MSSQL_TABLE: process.env.MSSQL_TABLE || "(not set)",
    MSSQL_TRUSTED_CONNECTION: process.env.MSSQL_TRUSTED_CONNECTION || "(not set)",
    MSSQL_USER: process.env.MSSQL_USER || "(not set)",
    MSSQL_PASSWORD: process.env.MSSQL_PASSWORD ? "(set)" : "(not set)",
  };

  try {
    const pool = await getPool();
    const req = pool.request();
    const result = await req.query(`
      SELECT
        @@SERVERNAME   AS ServerName,
        DB_NAME()      AS DatabaseName,
        COUNT(*)       AS EmployeeCount
      FROM ${process.env.MSSQL_TABLE || "dbo.Employees"}
    `);

    return NextResponse.json({
      status: "✅ Connected successfully",
      env: results,
      server: result.recordset[0].ServerName,
      database: result.recordset[0].DatabaseName,
      employeeCount: result.recordset[0].EmployeeCount,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({
      status: "❌ Connection failed",
      env: results,
      error: err.message,
      hint: getHint(err.message),
    }, { status: 500 });
  }
}

function getHint(msg: string): string {
  if (msg.includes("ECONNREFUSED") || msg.includes("Could not open a connection"))
    return "SQL Server is not reachable. Check MSSQL_SERVER value and ensure TCP/IP is enabled on port 1433.";
  if (msg.includes("Login failed"))
    return "Wrong username or password. Check MSSQL_USER and MSSQL_PASSWORD.";
  if (msg.includes("Cannot open database"))
    return "Database not found. Check MSSQL_DATABASE value.";
  if (msg.includes("Invalid object name"))
    return "Table not found. Check MSSQL_TABLE value (e.g. dbo.Employees).";
  if (msg.includes("YOUR_SERVER_NAME") || msg.includes("getaddrinfo"))
    return "MSSQL_SERVER is still a placeholder. Fill in your real server name in .env.local.";
  return "Check your .env.local values and ensure SQL Server is running.";
}
