-- ============================================================
--  PROJECT AWARD — Complete Test & Seed Data Script
--  Run this script in SSMS to populate realistic sample data
-- ============================================================

USE [Rewards];
GO

-- 1. Ensure IsAdmin column exists on dbo.EmpRoles table
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'EmpRoles' AND COLUMN_NAME = 'IsAdmin'
)
BEGIN
    ALTER TABLE dbo.EmpRoles ADD IsAdmin BIT NOT NULL DEFAULT 0;
    PRINT 'Added column IsAdmin to dbo.EmpRoles';
END
GO

-- 2. Insert Sample Employees
MERGE dbo.Employees AS target
USING (VALUES
    ('M1001', 'Aditya Kumar',   'aditya.kumar@company.com',   'hr',  'Gurgaon', 'HR Director & System Admin'),
    ('M1002', 'Vikram Singh',   'vikram.singh@company.com',   'rnd', 'Gurgaon', 'R&D Head'),
    ('M1003', 'Priya Sharma',   'priya.sharma@company.com',   'fin', 'Gurgaon', 'Finance Executive'),
    ('M1004', 'Sanjay Dutt',    'sanjay.dutt@company.com',    'rnd', 'Gurgaon', 'Senior Software Engineer'),
    ('M1005', 'Ananya Roy',     'ananya.roy@company.com',     'hr',  'Mumbai',  'HR Specialist'),
    ('M1006', 'Rohan Mehta',    'rohan.mehta@company.com',    'fin', 'Mumbai',  'Finance Head')
) AS source (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
ON target.Emp_No = source.Emp_No
WHEN MATCHED THEN
    UPDATE SET DisplayName = source.DisplayName, Work_Email = source.Work_Email, Department = source.Department, Location = source.Location, Designation = source.Designation
WHEN NOT MATCHED THEN
    INSERT (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
    VALUES (source.Emp_No, source.DisplayName, source.Work_Email, source.Department, source.Location, source.Designation);
GO

-- 3. Assign System Roles & Permissions (HR, HOD, Panel Judge, System Admin)
MERGE dbo.EmpRoles AS target
USING (VALUES 
    -- Emp_No, Role, IsHOD, IsPanelJudge, IsAdmin, Gender
    ('M1001', 'hr',       1, 0, 1, 'Male'),   -- M1001: HR Admin + HOD + System Admin
    ('M1002', 'hod',      1, 1, 0, 'Male'),   -- M1002: HOD (R&D) + Panel Judge
    ('M1003', 'employee', 0, 0, 0, 'Female'), -- M1003: Staff Member
    ('M1004', 'employee', 0, 1, 0, 'Male'),   -- M1004: Staff + Panel Judge
    ('M1005', 'hr',       0, 0, 0, 'Female'), -- M1005: Standard HR (Non-Admin)
    ('M1006', 'hod',      1, 0, 0, 'Male')    -- M1006: HOD (Finance)
) AS source (Emp_No, Role, IsHOD, IsPanelJudge, IsAdmin, Gender)
ON target.Emp_No = source.Emp_No
WHEN MATCHED THEN
    UPDATE SET Role = source.Role, IsHOD = source.IsHOD, IsPanelJudge = source.IsPanelJudge, IsAdmin = source.IsAdmin, Gender = source.Gender, UpdatedAt = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (Emp_No, Role, IsHOD, IsPanelJudge, IsAdmin, Gender) 
    VALUES (source.Emp_No, source.Role, source.IsHOD, source.IsPanelJudge, source.IsAdmin, source.Gender);
GO

-- 4. Display Inserted Users & Test Login Passwords
SELECT
    e.Emp_No                                                        AS [Emp_ID],
    e.DisplayName                                                   AS [Full_Name],
    e.Department                                                    AS [Dept],
    ISNULL(r.Role, 'employee')                                      AS [System_Role],
    ISNULL(r.IsHOD, 0)                                             AS [Is_HOD],
    ISNULL(r.IsAdmin, 0)                                           AS [Is_Admin],
    ISNULL(r.IsPanelJudge, 0)                                      AS [Is_Judge],
    RIGHT(TRIM(e.Emp_No), 4) + SUBSTRING(TRIM(e.DisplayName), 1, 4) AS [Default_Login_Password]
FROM dbo.Employees e
LEFT JOIN dbo.EmpRoles r ON e.Emp_No = r.Emp_No
ORDER BY e.Emp_No;
GO
