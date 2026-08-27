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
