-- ============================================================
--  PROJECT AWARD — Complete SQL Server Setup & Schema
--  Run this script in SSMS to create Database, Tables, and Indexes
-- ============================================================

-- 1. Create Rewards Database if not exists
USE [master];
GO

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = 'Rewards')
BEGIN
    CREATE DATABASE [Rewards];
    PRINT 'Created database: Rewards';
END
GO

USE [Rewards];
GO

-- ============================================================
-- TABLE 1: Employees  (HR Master Directory)
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Employees'
)
BEGIN
    CREATE TABLE dbo.Employees (
        Emp_No          NVARCHAR(20)    NOT NULL,
        DisplayName     NVARCHAR(100)   NOT NULL,
        Work_Email      NVARCHAR(150)   NULL,
        Department      NVARCHAR(100)   NULL,
        Location        NVARCHAR(100)   NULL,
        Designation     NVARCHAR(100)   NULL,
        CONSTRAINT PK_Employees PRIMARY KEY (Emp_No)
    );
    PRINT 'Created table: dbo.Employees';
END
GO

-- ============================================================
-- TABLE 2: EmpRoles  (App-specific: role, HOD flag & panel judge)
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'EmpRoles'
)
BEGIN
    CREATE TABLE dbo.EmpRoles (
        Emp_No          NVARCHAR(20)    NOT NULL,
        Role            NVARCHAR(20)    NOT NULL DEFAULT 'employee',
        IsHOD           BIT             NOT NULL DEFAULT 0,
        IsPanelJudge    BIT             NOT NULL DEFAULT 0,
        IsAdmin         BIT             NOT NULL DEFAULT 0,
        Gender          NVARCHAR(10)    NULL,
        UpdatedAt       DATETIME2       NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_EmpRoles PRIMARY KEY (Emp_No),
        CONSTRAINT FK_EmpRoles_Employees
            FOREIGN KEY (Emp_No) REFERENCES dbo.Employees(Emp_No)
            ON DELETE CASCADE
    );
    PRINT 'Created table: dbo.EmpRoles';
END
ELSE
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'EmpRoles' AND COLUMN_NAME = 'IsHOD'
    )
    BEGIN
        ALTER TABLE dbo.EmpRoles ADD IsHOD BIT NOT NULL DEFAULT 0;
        PRINT 'Added column IsHOD to existing dbo.EmpRoles';
    END

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'EmpRoles' AND COLUMN_NAME = 'IsAdmin'
    )
    BEGIN
        ALTER TABLE dbo.EmpRoles ADD IsAdmin BIT NOT NULL DEFAULT 0;
        PRINT 'Added column IsAdmin to existing dbo.EmpRoles';
    END
END
GO

-- ============================================================
-- TABLE 3: EmpPasswords  (Custom password hashes — SHA-256)
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'EmpPasswords'
)
BEGIN
    CREATE TABLE dbo.EmpPasswords (
        Emp_No          NVARCHAR(20)    NOT NULL,
        PasswordHash    NVARCHAR(64)    NOT NULL,
        UpdatedAt       DATETIME2       NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_EmpPasswords PRIMARY KEY (Emp_No),
        CONSTRAINT FK_EmpPasswords_Employees
            FOREIGN KEY (Emp_No) REFERENCES dbo.Employees(Emp_No)
            ON DELETE CASCADE
    );
    PRINT 'Created table: dbo.EmpPasswords';
END
GO

-- ============================================================
-- TABLE 4: Cycles  (Monthly Nominations, Endorsements, Scores)
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Cycles'
)
BEGIN
    CREATE TABLE dbo.Cycles (
        Month           NVARCHAR(10)    NOT NULL,   -- e.g. '2026-08'
        DataJSON        NVARCHAR(MAX)   NOT NULL,   -- Complete cycle state in JSON
        UpdatedAt       DATETIME2       NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_Cycles PRIMARY KEY (Month)
    );
    PRINT 'Created table: dbo.Cycles';
END
GO

-- ============================================================
-- TABLE 5: Points  (Annual R&R / LSIP Ledger)
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Points'
)
BEGIN
    CREATE TABLE dbo.Points (
        KeyName         NVARCHAR(50)    NOT NULL,   -- e.g. 'annual_ledger'
        DataJSON        NVARCHAR(MAX)   NOT NULL,   -- Complete ledger in JSON
        UpdatedAt       DATETIME2       NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_Points PRIMARY KEY (KeyName)
    );
    PRINT 'Created table: dbo.Points';
END
GO

-- ============================================================
-- TABLE 6: Branding  (App Header Logo & Customization)
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Branding'
)
BEGIN
    CREATE TABLE dbo.Branding (
        KeyName         NVARCHAR(50)    NOT NULL,   -- e.g. 'header_logo'
        LogoUrl         NVARCHAR(MAX)   NOT NULL,
        UpdatedAt       DATETIME2       NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_Branding PRIMARY KEY (KeyName)
    );
    PRINT 'Created table: dbo.Branding';
END
GO

-- ============================================================
-- INDEXES
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmpRoles_Role')
    CREATE INDEX IX_EmpRoles_Role ON dbo.EmpRoles (Role);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmpRoles_IsHOD')
    CREATE INDEX IX_EmpRoles_IsHOD ON dbo.EmpRoles (IsHOD);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_Department')
    CREATE INDEX IX_Employees_Department ON dbo.Employees (Department);
GO

PRINT '=== Setup complete — Database Rewards and 6 Tables Ready ===';
GO




USE [Rewards];
GO

-- 1. Map login 'Rewards' to the database user 'Rewards' (if not already mapped)
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = N'Rewards')
BEGIN
    CREATE USER [Rewards] FOR LOGIN [Rewards];
END
GO

-- 2. Grant Read & Write permissions on the entire Rewards database
ALTER ROLE db_datareader ADD MEMBER [Rewards];
ALTER ROLE db_datawriter ADD MEMBER [Rewards];
GO

-- 3. Explicitly grant permissions on the dbo schema
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [Rewards];
GO



-- DOMAIN / CORS CONFIGURATION
-- Configured in next.config.ts and middleware.ts for both localhost and reward-mahle.local:3000
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["msnodesqlv8", "mssql"],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With" },
        ],
      },
    ];
  },
};

export default nextConfig;


-- DATABASE 

USE [Rewards];
GO

INSERT INTO dbo.Employees (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
VALUES ('M1004', 'Sanjay Dutt', 'sanjay.dutt@company.com', 'rnd', 'Gurgaon', 'Senior Engineer');


USE [Rewards];
GO

-- 1. Add Employee
INSERT INTO dbo.Employees (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
VALUES ('M1005', 'Ananya Roy', 'ananya.roy@company.com', 'hr', 'Gurgaon', 'HR Lead');

-- 2. Assign Role (Role can be 'hr', 'hod', or 'employee')
INSERT INTO dbo.EmpRoles (Emp_No, Role, IsHOD, IsPanelJudge, Gender)
VALUES ('M1005', 'hr', 0, 1, 'Female');



USE [Rewards];
GO

INSERT INTO dbo.Employees (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
VALUES 
    ('M1006', 'Rohan Mehta',   'rohan.m@company.com',   'fin', 'Mumbai',  'Financial Analyst'),
    ('M1007', 'Kavita Reddy',  'kavita.r@company.com',  'rnd', 'Gurgaon', 'Quality Engineer'),
    ('M1008', 'Amitabh Verma', 'amitabh.v@company.com', 'hr',  'Delhi',   'Talent Specialist');

-- Assign default roles in bulk
INSERT INTO dbo.EmpRoles (Emp_No, Role, IsHOD, IsPanelJudge, Gender)
VALUES 
    ('M1006', 'employee', 0, 0, 'Male'),
    ('M1007', 'hod',      1, 0, 'Female'), -- HOD of R&D
    ('M1008', 'employee', 0, 0, 'Male');


USE [Rewards];
GO

MERGE dbo.Employees AS target
USING (VALUES 
    ('M1009', 'Neha Gupta', 'neha.g@company.com', 'fin', 'Gurgaon', 'Senior Auditor')
) AS source (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
ON target.Emp_No = source.Emp_No
WHEN MATCHED THEN
    UPDATE SET 
        DisplayName = source.DisplayName, 
        Work_Email = source.Work_Email, 
        Department = source.Department,
        Location = source.Location,
        Designation = source.Designation
WHEN NOT MATCHED THEN
    INSERT (Emp_No, DisplayName, Work_Email, Department, Location, Designation) 
    VALUES (source.Emp_No, source.DisplayName, source.Work_Email, source.Department, source.Location, source.Designation);


USE [Rewards];
GO

-- 1. Insert Employee
INSERT INTO dbo.Employees (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
VALUES ('M1010', 'Deepak Joshi', 'deepak.j@company.com', 'rnd', 'Gurgaon', 'System Architect');

-- 2. Insert Custom Password Hash (SHA-256 hash of 'MyCustomPass#2026')
INSERT INTO dbo.EmpPasswords (Emp_No, PasswordHash)
VALUES (
    'M1010', 
    LOWER(CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'MyCustomPass#2026'), 2))
);


SELECT 
    e.Emp_No,
    e.DisplayName,
    e.Department,
    ISNULL(r.Role, 'employee') AS [Role],
    ISNULL(r.IsHOD, 0) AS [IsHOD],
    CASE 
        WHEN p.PasswordHash IS NOT NULL THEN '[Custom Hashed Password]'
        ELSE RIGHT(TRIM(e.Emp_No), 4) + SUBSTRING(TRIM(e.DisplayName), 1, 4)
    END AS [Active_Login_Password]
FROM dbo.Employees e
LEFT JOIN dbo.EmpRoles r ON e.Emp_No = r.Emp_No
LEFT JOIN dbo.EmpPasswords p ON e.Emp_No = p.Emp_No;


-- TRUNCATE

USE [Rewards];
GO

-- 1. Delete dependent child tables & employees (ON DELETE CASCADE will also clean child tables)
DELETE FROM dbo.EmpPasswords;
DELETE FROM dbo.EmpRoles;
DELETE FROM dbo.Employees;

-- 2. Delete app state & configuration data
DELETE FROM dbo.Cycles;
DELETE FROM dbo.Points;
DELETE FROM dbo.Branding;

PRINT '=== All table data successfully deleted. Database structure remains intact. ===';
GO
