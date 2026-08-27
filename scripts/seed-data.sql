-- ============================================================
--  PROJECT AWARD — Quick Start Test Data (3 Users)
--  Run this script in SSMS on your database
-- ============================================================

USE [Rewards];   -- Uses your Rewards database
GO

-- 1. Insert 3 Employees (if not already present)
IF NOT EXISTS (SELECT 1 FROM dbo.Employees WHERE Emp_No = 'M1001')
    INSERT INTO dbo.Employees (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
    VALUES ('M1001', 'Aditya Kumar', 'aditya.kumar@mahle.com', 'hr', 'Gurgaon', 'HR Manager');

IF NOT EXISTS (SELECT 1 FROM dbo.Employees WHERE Emp_No = 'M1002')
    INSERT INTO dbo.Employees (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
    VALUES ('M1002', 'Vikram Singh', 'vikram.singh@mahle.com', 'rnd', 'Gurgaon', 'R&D Manager');

IF NOT EXISTS (SELECT 1 FROM dbo.Employees WHERE Emp_No = 'M1003')
    INSERT INTO dbo.Employees (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
    VALUES ('M1003', 'Priya Sharma', 'priya.sharma@mahle.com', 'fin', 'Gurgaon', 'Finance Executive');
GO

-- 2. Assign Roles (HR Admin, HOD, Employee)
MERGE dbo.EmpRoles AS target
USING (
    VALUES 
        ('M1001', 'hr',  0, 0),   -- M1001: HR Admin
        ('M1002', 'hod', 1, 1),   -- M1002: HOD (Head of R&D) + Panel Judge
        ('M1003', 'employee', 0, 0) -- M1003: Staff Member
) AS source (Emp_No, Role, IsHOD, IsPanelJudge)
ON target.Emp_No = source.Emp_No
WHEN MATCHED THEN
    UPDATE SET Role = source.Role, IsHOD = source.IsHOD, IsPanelJudge = source.IsPanelJudge, UpdatedAt = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (Emp_No, Role, IsHOD, IsPanelJudge) VALUES (source.Emp_No, source.Role, source.IsHOD, source.IsPanelJudge);
GO

-- 3. Verify inserted users and display login credentials
SELECT
    e.Emp_No                        AS [Employee_Code],
    e.DisplayName                   AS [Full_Name],
    e.Department                    AS [Dept],
    ISNULL(r.Role, 'employee')      AS [Portal_Role],
    ISNULL(r.IsHOD, 0)             AS [Is_HOD],
    ISNULL(r.IsPanelJudge, 0)      AS [Is_Judge],
    RIGHT(e.Emp_No, 4) + LEFT(REPLACE(e.DisplayName, ' ', ''), 4) AS [Default_Password]
FROM dbo.Employees e
LEFT JOIN dbo.EmpRoles r ON e.Emp_No = r.Emp_No
WHERE e.Emp_No IN ('M1001', 'M1002', 'M1003')
ORDER BY e.Emp_No;
GO
