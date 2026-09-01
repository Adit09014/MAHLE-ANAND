-- ====================================================================
-- FULL BULK EMPLOYEE SEED SCRIPT FOR MAHLE ANAND FILTER SYSTEM
-- Generated directly from User CSV (Total Records: 338)
-- ====================================================================
USE [Rewards];
GO

SET NOCOUNT ON;

-- 1. Upsert Employee Records
MERGE dbo.Employees AS target
USING (VALUES
  (N'001332', N'Shekhar Kanifnath Khedekar', N'shekhar.khedekar@mahle.com', N'Production', N'PUNE', N'Asst. Manager'),
  (N'001335', N'Sachin Dhamale C', N'sachdhamale@mahle.com', N'Purchase', N'PUNE', N'Sr. Engineer'),
  (N'001336', N'Chopade Bajirao Nana', N'bajirao.chaupade@mahle.com', N'Production', N'PUNE', N'Engineer'),
  (N'001337', N'Sanjay Nivruttirao Patode', N'sanjay.a.patode@mahle.com', N'Maintenance', N'PUNE', N'Sr. Engineer'),
  (N'001351', N'Sandeep Baburao Malvi', N'sandeep.malvi@mahle.com', N'Process Engineering', N'PUNE', N'Manager'),
  (N'001656', N'Polayi Mithun K', N'mithun.polayi@mahle.com', N'Engineering (R&D)', N'Head Office', N'Asst. Manager'),
  (N'001693', N'Writusree Das', N'writushree.a.das@mahle.com', N'Supply Chain', N'PUNE', N'Sr. Engineer'),
  (N'001729', N'Vinesh Kumar Jha', N'vinesh.jha@mahle.com', N'Production', N'PUNE', N'Engineer'),
  (N'001754', N'Samanta Arindam', N'samanta.arindam@mahle.com', N'Central Quality', N'PUNE', N'Sr. Engineer'),
  (N'001806', N'Jitendra Kumar', N'', N'Maintenance', N'CHENNAI', N'Engineer'),
  (N'001825', N'Jogdand Shuddhodhan Yashwant', N'shuddhodhan.jogdand@mahle.com', N'Production', N'PUNE', N'Engineer'),
  (N'001828', N'Rajesh Chandrakant Mahangare', N'rajesh.mahangare@mahle.com', N'Maintenance', N'PUNE', N'Engineer'),
  (N'001914', N'Prakash Kumar', N'prakash.a.kumar@mahle.com', N'Engineering (R&D)', N'PUNE', N'Engineer'),
  (N'001935', N'Shivshankar Roy Roy', N'shivshankar.roy@mahle.com', N'SCM', N'PUNE', N'Sr. Engineer'),
  (N'002028', N'Santosh Hanumant Mane', N'santosh.mane@mahle.com', N'Maintenance', N'PUNE', N'Sr. Engineer'),
  (N'002162', N'Inteqhab Khan', N'inteqhab.khan@mahle.com', N'EHS', N'Parwanoo-1', N'Sr. Engineer'),
  (N'002234', N'Shubham Singh', N'shubham.singh@mahle.com', N'Supply Chain', N'PUNE', N'Sr. Engineer'),
  (N'006505', N'Shailesh R Nakhate', N'shailesh.nakhate@mahle.com', N'Central Purchase', N'PUNE', N'Manager'),
  (N'006579', N'Kumbhar Rahul Yashwant', N'rahul.kumbhar@mahle.com', N'OE Marketing', N'PUNE', N'Sr. Manager'),
  (N'006637', N'Jayprakash Manore', N'jayprakash.a.manore@mahle.com', N'Production', N'PUNE', N'GM'),
  (N'006642', N'Ravikumar Sharanappa Dinni', N'Ravikumar.Dinni@mahle.com', N'Engineering (R&D)', N'PUNE', N'DGM'),
  (N'006670', N'Prashant Prakash Tongire', N'prashant.tongire@mahle.com', N'Quality', N'PUNE', N'Manager'),
  (N'006671', N'Prashant Chauhan', N'prashant.chauhan@mahle.com', N'Supply Chain', N'Head Office', N'AGM'),
  (N'006673', N'Maheswar Pati', N'maheswar.pati@mahle.com', N'Finance', N'PUNE', N'Manager'),
  (N'006676', N'Saidutta Dipankar Biswal', N'dipankar.biswal@mahle.com', N'Supply Chain', N'PUNE', N'Asst. Manager'),
  (N'006681', N'Rahul Kumar', N'rahul.c.kumar@mahle.com', N'PPC', N'PUNE', N'Sr. Engineer'),
  (N'006682', N'Priya ranjan Sahoo', N'priyaranjan.sahoo@mahle.com', N'Maintenance', N'PUNE', N'Manager'),
  (N'006685', N'Ganesh Parmeshwar surve', N'ganesh.surve@mahle.com', N'Maintenance', N'PUNE', N'Sr. Engineer'),
  (N'006687', N'Sandeep Uttam Shinde', N'sandip.shinde@mahle.com', N'HR', N'PUNE', N'Sr. Executive'),
  (N'006688', N'Shubham Kachrudas Sonawane', N'Shubham.Sonawane@mahle.com', N'Quality', N'PUNE', N'Sr. Engineer'),
  (N'006689', N'Amol Jijabhau Said', N'amol.said@mahle.com', N'Purchase', N'PUNE', N'Sr. Engineer'),
  (N'006690', N'Praveen Basavaraj Balekundri', N'praveen.balekundri@mahle.com', N'Engineering (R&D)', N'PUNE', N'Asst. Manager'),
  (N'006691', N'Pradeep Shabadi', N'Pradeep.a.Shabadi@mahle.com', N'Engineering (R&D)', N'PUNE', N'Sr. Engineer'),
  (N'006692', N'Jivan Ramesh Chaudhari', N'jivan.chaudhari@mahle.com', N'PROJECT MANAGEMENT', N'PUNE', N'Asst. Manager'),
  (N'006694', N'Prashant Bhaskar Bhusari', N'Prashant.b.Bhusari@mahle.com', N'Engineering (R&D)', N'PUNE', N'Sr. Engineer'),
  (N'006696', N'Jugnu Kumar Singh', N'JugnuKumar.Singh@mahle.com', N'Production', N'PUNE', N'Sr. Engineer'),
  (N'006699', N'Vijay Garimella', N'vijay.garimella@mahle.com', N'Production', N'PUNE', N'Assistant Manager'),
  (N'006701', N'Shrinivas Rajendra Shinde', N'shrinivas.shinde@mahle.com', N'Process Engineering', N'PUNE', N'Sr. Engineer'),
  (N'006703', N'Ravichandra Appasaheb Mali', N'ravichandra.mali@mahle.com', N'Quality', N'PUNE', N'Senior Engineer'),
  (N'006706', N'Abhijit Jaykrishna Deshpande', N'abhijit.deshpande@mahle.com', N'PROJECT MANAGEMENT', N'PUNE', N'DGM'),
  (N'006707', N'Tushar Santosh Pawar', N'tushar.pawar@mahle.com', N'HR', N'PUNE', N'Sr. Manager'),
  (N'006708', N'Shekhar Shashikant Sankpal', N'shekhar.sankpal@mahle.com', N'Quality', N'PUNE', N'Sr. Engineer'),
  (N'006709', N'Dinesh Ramdas Satav', N'dinesh.satav@mahle.com', N'Quality', N'PUNE', N'Assistant Manager'),
  (N'006711', N'Akshay Bhagwat Gayakwad', N'akshay.gayakwad@mahle.com', N'Central Quality', N'PUNE', N'Sr. Engineer'),
  (N'006712', N'Aarti Ganpatrao Shinde', N'aarti.shinde@mahle.com', N'SCM', N'PUNE', N'Sr. Manager'),
  (N'006713', N'Mihir Vivek Ratnakar', N'mihir.ratnakar@mahle.com', N'EHS', N'PUNE', N'Sr. Engineer'),
  (N'1002', N'Palani Ashokan', N'p.ashokan@mahle.com', N'Process Engineering', N'CHENNAI', N'Sr. Manager'),
  (N'1009', N'N Prem Kumar', N'n.premkumar@mahle.com', N'Tooling', N'CHENNAI', N'Sr. Manager'),
  (N'1027', N'B Vasantha Kumar', N'vasanthakumar.baskaran@mahle.com', N'Central Process', N'CHENNAI', N'AGM'),
  (N'1030', N'K P Arun', N'arun.narayanan@mahle.com', N'Central Process', N'Chennai-HO', N'Manager')
) AS source (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
ON target.Emp_No = source.Emp_No
WHEN MATCHED THEN
  UPDATE SET DisplayName = source.DisplayName, Work_Email = source.Work_Email, Department = source.Department, Location = source.Location, Designation = source.Designation
WHEN NOT MATCHED THEN
  INSERT (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
  VALUES (source.Emp_No, source.DisplayName, source.Work_Email, source.Department, source.Location, source.Designation);
GO

MERGE dbo.Employees AS target
USING (VALUES
  (N'1031', N'R Shankar', N'shankar.rajendran@mahle.com', N'PROJECT MANAGEMENT', N'Chennai-HO', N'Sr. Manager'),
  (N'1033', N'Sunil KUMAR', N'Sunilkumar.veersingh@mahle.com', N'Production', N'Khandsa', N'Asst. Manager'),
  (N'1048', N'Raja R', N'raja.rajaram@mahle.com', N'Production', N'CHENNAI', N'Manager'),
  (N'1052', N'Sanjeevi Kumar', N'sanjeevi.kumar@mahle.com', N'SCM', N'CHENNAI', N'Sr. Manager'),
  (N'1077', N'Vijayaraghavan M', N'vijayaraghavan.muralidharan@mahle.com', N'Supply Chain', N'CHENNAI', N'Asst. Manager'),
  (N'1078', N'K Sheik Jamaludeen', N'sheik.jamaludeen@mahle.com', N'Maintenance', N'CHENNAI', N'Assistant Manager'),
  (N'1084', N'Ramkumar P', N'ramkumar.palanivel@mahle.com', N'Tooling', N'CHENNAI', N'Asst. Manager'),
  (N'1088', N'Sowrimuthu A', N'chennai.maintenance@mahle.com', N'Maintenance', N'CHENNAI', N'Engineer'),
  (N'1089', N'T Madhavan', N'madhavan.thangaraj@mahle.com', N'Purchase', N'CHENNAI', N'Asst. Manager'),
  (N'1092', N'Sridhar K', N'sridhar.kannan@mahle.com', N'Production', N'CHENNAI', N'Sr. Manager'),
  (N'1098', N'Kumaravel Ranganathan', N'kumaravel.ranganathan@mahle.com', N'Production', N'CHENNAI', N'Asst. Manager'),
  (N'1099', N'V S Mohan Kumar', N'mohan.a.kumar@mahle.com', N'Maintenance', N'CHENNAI', N'Asst. Manager'),
  (N'1105', N'Kalyanasundaram T', N'kalyanasundaram.t@mahle.com', N'Process Engineering', N'CHENNAI', N'Senior Engineer'),
  (N'1107', N'Sai Ganesh H', N'saiganesh.h@mahle.com', N'Process Engineering', N'CHENNAI', N'Senior Engineer'),
  (N'1108', N'Shyam Babu S', N'shyambabu.s@mahle.com', N'Quality', N'CHENNAI', N'Asst. Manager'),
  (N'1109', N'Mareeswaran T', N'mareeswaran.t@mahle.com', N'HR', N'CHENNAI', N'Manager'),
  (N'1110', N'Arun kumar R', N'arunkumar.r@mahle.com', N'Safety', N'CHENNAI', N'Sr. Engineer'),
  (N'1112', N'Keerthivel', N'', N'Tooling', N'CHENNAI', N'Engineer'),
  (N'1113', N'Godha Yeshwanth Goud', N'yeshwanth.a.goud@mahle.com', N'Process Engineering', N'CHENNAI', N'Senior Engineer'),
  (N'1114', N'Nancy Y', N'nancy.y@mahle.com', N'HR', N'CHENNAI', N'Assistant Manager'),
  (N'1116', N'Vinayagam V', N'', N'Maintenance', N'CHENNAI', N'Engineer'),
  (N'1117', N'Srinivasan Lakshmanaperumal', N'', N'Process Engineering', N'CHENNAI', N'Sr. Engineer'),
  (N'1118', N'Rahuman N', N'', N'Maintenance', N'CHENNAI', N'Engineer'),
  (N'1119', N'Mikhail Prabhudas N', N'mikhailprabhudas.n@mahle.com', N'Quality', N'CHENNAI', N'Assistant Manager'),
  (N'1120', N'Jeyavelu N', N'jeyavelu.n@mahle.com', N'Maintenance', N'CHENNAI', N'Assistant Manager'),
  (N'1121', N'Sathish Kumar', N'sathishkumar.b@mahle.com', N'Quality', N'CHENNAI', N'Assistant Manager'),
  (N'1122', N'Vivin TS', N'vivin.ts@mahle.com', N'Process Engineering', N'CHENNAI', N'Assistant Manager'),
  (N'1123', N'Murugananthan A', N'', N'Maintenance', N'CHENNAI', N'Senior Engineer'),
  (N'6007', N'R Kumaresan', N'kumaresan.ramachandran@mahle.com', N'Quality', N'CHENNAI', N'Manager'),
  (N'6009', N'Kulandai Veeramakali R', N'veera.rajendran@mahle.com', N'Supply Chain', N'CHENNAI', N'Sr. Engineer'),
  (N'6074', N'G Anitha', N'anitha.ganesan@mahle.com', N'Supply Chain', N'CHENNAI', N'Engineer'),
  (N'6096', N'Praveen Kumar', N'Praveenkumar.Selvaraj@mahle.com', N'Tooling', N'CHENNAI', N'Engineer'),
  (N'6126', N'Korapati Yesanna', N'korapati.yesanna@mahle.com', N'Quality', N'CHENNAI', N'Engineer'),
  (N'6139', N'Subramani', N'subramani.shanmugavel@mahle.com', N'Production', N'CHENNAI', N'Sr. Engineer'),
  (N'6165', N'M.Rathinavel', N'', N'Production', N'CHENNAI', N'Engineer'),
  (N'6187', N'Sasikumar Marimuthu', N'Sasikumar.Marimuthu@mahle.com', N'Quality', N'CHENNAI', N'Engineer'),
  (N'6215', N'Dibyendu chakraborty', N'Dibyendu.Chakraborty@mahle.com', N'Engineering (R&D)', N'PUNE', N'Engineer'),
  (N'8021', N'Asif Aziz TP', N'asif.aziz@mahle.com', N'Central Quality', N'Chennai-HO', N'Engineer'),
  (N'8409', N'Sivaperumal', N'', N'Production', N'CHENNAI', N'Engineer'),
  (N'8411', N'Gokulakrishnan Sankar', N'', N'Production', N'CHENNAI', N'Asst. Engineer'),
  (N'8412', N'R Vignesh', N'', N'Production', N'CHENNAI', N'Asst. Engineer'),
  (N'8413', N'Shubhadip Jana', N'', N'Production', N'CHENNAI', N'Asst. Engineer'),
  (N'E20067', N'Laxmi Prakash Pradhan', N'laxmi.pradhan@mahle.com', N'Production', N'Parwanoo-1', N'DGM'),
  (N'E20070', N'Deepak Jangra', N'deepak.jangra@mahle.com', N'Central Quality', N'Head Office', N'AGM'),
  (N'E20089', N'Kamal Kumar Panda', N'kamal.panda@mahle.com', N'Central Process', N'CHENNAI', N'DGM'),
  (N'E20196', N'Raju Kumar Yadav', N'raju.yadav@mahle.com', N'Quality', N'Khandsa', N'Senior Engineer'),
  (N'E40002', N'Anil Banta', N'anil.banta@mahle.com', N'After Market', N'Parwanoo-1', N'DGM'),
  (N'E40007', N'Anuj Chauhan', N'anuj.chauhan@mahle.com', N'Engineering (R&D)', N'Parwanoo-1', N'Asst. Manager'),
  (N'E40022', N'Banita Chaudhary', N'banita.chaudhary@mahle.com', N'Production', N'Parwanoo-1', N'Engineer'),
  (N'E40032', N'Deepinder Singh', N'Deepinder.singh@mahle.com', N'Engineering (R&D)', N'Head Office', N'Engineer')
) AS source (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
ON target.Emp_No = source.Emp_No
WHEN MATCHED THEN
  UPDATE SET DisplayName = source.DisplayName, Work_Email = source.Work_Email, Department = source.Department, Location = source.Location, Designation = source.Designation
WHEN NOT MATCHED THEN
  INSERT (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
  VALUES (source.Emp_No, source.DisplayName, source.Work_Email, source.Department, source.Location, source.Designation);
GO

MERGE dbo.Employees AS target
USING (VALUES
  (N'E40041', N'Ishita Bodh', N'ishita.bodh@mahle.com', N'Central Process', N'Head Office', N'Sr. Engineer'),
  (N'E40053', N'Mohit Singla', N'mohit.singla@mahle.com', N'Central Purchase', N'Head Office', N'AGM'),
  (N'E40055', N'Mohan Sharma', N'mohan.sharma@mahle.com', N'Process', N'Parwanoo-1', N'Asst. Manager'),
  (N'E40065', N'Nishant Prasher', N'nishant.prasher@mahle.com', N'SCM', N'Parwanoo-1', N'Engineer'),
  (N'E40069', N'Pradeep Thakur', N'pradeep.thakur@mahle.com', N'Quality', N'Parwanoo-1', N'Asst. Manager'),
  (N'E40073', N'Pankush Kumar', N'pankush.kumar@mahle.com', N'Production', N'Parwanoo-1', N'Manager'),
  (N'E40074', N'Ravinder Singh Bajwa', N'ravinder.bajwa@mahle.com', N'Finance', N'Head Office', N'Sr. Manager'),
  (N'E40075', N'Reena Sharma', N'reena.sharma@mahle.com', N'Quality', N'Parwanoo-1', N'Manager'),
  (N'E40082', N'Robin Pant', N'robpant@mahle.com', N'SCM', N'Parwanoo-1', N'Manager'),
  (N'E40090', N'Shahnawaz Hussain', N'molvi.shahnawaj@mahle.com', N'After Market', N'Parwanoo-1', N'Manager'),
  (N'E40093', N'Sanju Kumar', N'sanju.kumar@mahle.com', N'Process Engineering', N'Khandsa', N'Asst. Manager'),
  (N'E40100', N'Sorabh Kalia', N'sorabh.kalia@mahle.com', N'Supply Chain', N'Parwanoo-1', N'Asst. Manager'),
  (N'E40101', N'Sanjesh Chauhan', N'sanjesh.chauhan@mahle.com', N'Process Engineering', N'Parwanoo-1', N'Manager'),
  (N'E40103', N'Tinku Jangra', N'Tinku.jangra@mahle.com', N'Supply Chain', N'Parwanoo-1', N'Asst. Manager'),
  (N'E40209', N'Asha Kumari', N'asha.sharma@mahle.com', N'Supply Chain', N'Khandsa', N'Sr. Engineer'),
  (N'E40292', N'Deepak Sharma', N'deepak.b.sharma@mahle.com', N'Quality', N'Parwanoo-1', N'Sr. Engineer'),
  (N'E40297', N'Pawan Kumar', N'Pawan.c.Kumar@mahle.com', N'Central Quality', N'Parwanoo-1', N'Engineer'),
  (N'E40370', N'Manisha Kumari', N'manisha.kumari@mahle.com', N'Quality', N'Parwanoo-1', N'Engineer'),
  (N'E50002', N'Ashok Kumar Tanwar', N'ashok.tanwar@mahle.com', N'Finance', N'Parwanoo-1', N'Sr. Manager'),
  (N'E50003', N'Ankush Kumar', N'ankush.chauhan@mahle.com', N'Purchase', N'Parwanoo-1', N'Asst. Manager'),
  (N'E50013', N'Deepak Goyal', N'deepak.goyal@mahle.com', N'Central Purchase', N'Head Office', N'AGM'),
  (N'E50037', N'Naresh Kumar', N'naresh.kumar@mahle.com', N'Maintenance', N'Parwanoo-1', N'Manager'),
  (N'E50039', N'Puneet Kumar', N'puneet.a.kumar@mahle.com', N'Production', N'Khandsa', N'Sr. Engineer'),
  (N'E50045', N'Satish Kumar Bhardwaj', N'satish.bhardwaj@mahle.com', N'Production', N'Parwanoo-1', N'Sr. Engineer'),
  (N'E50076', N'Arun Chauhan', N'arun.chauhan@mahle.com', N'Production', N'Parwanoo-1', N'Sr. Engineer'),
  (N'E50108', N'Jagbeer Singh', N'', N'Production', N'Parwanoo-1', N'Engineer'),
  (N'E50135', N'Puneet Bhardwaj', N'Puneet.Bhardwaj@mahle.com', N'Production', N'Parwanoo-1', N'Engineer'),
  (N'E50162', N'Shashi Kumar', N'', N'Production', N'Parwanoo-1', N'Engineer'),
  (N'E50203', N'Yogesh Kumar', N'yogesh.kumar@mahle.com', N'Maintenance', N'Parwanoo-1', N'Sr. Engineer'),
  (N'E50278', N'Anil Sharma', N'puneet.a.kumar@mahle.com', N'Production', N'Khandsa', N'Engineer'),
  (N'E50322', N'Sudhir Rai', N'', N'Production', N'Khandsa', N'Engineer'),
  (N'E50332', N'Deepak Sharma', N'deepak.c.sharma@mahle.com', N'Quality', N'Parwanoo-1', N'Engineer'),
  (N'E50396', N'Mandeep Agan', N'mandeep.a.agan@mahle.com', N'Quality', N'Khandsa', N'Engineer'),
  (N'E50432', N'Ankur', N'ankur.b.kumar@mahle.com', N'HR', N'Parwanoo-1', N'Asst. Manager'),
  (N'E50433', N'Ramneek Sharma', N'ramneek.a.sharma@mahle.com', N'Quality', N'Parwanoo-1', N'Asst. Manager'),
  (N'E50438', N'Parul Walia', N'parul.walia@mahle.com', N'HR', N'Parwanoo-1', N'Manager'),
  (N'K0060', N'Manoj Yadav', N'manoj.yadav@mahle.com', N'Supply Chain', N'Khandsa', N'Asst. Manager'),
  (N'K0075', N'Preeti Bhatia', N'preeti.bhatia@mahle.com', N'Central Quality', N'Head Office', N'Sr. Engineer'),
  (N'K0099', N'Poonam Saini', N'poonam.saini@mahle.com', N'Central Quality', N'Head Office', N'Asst. Manager'),
  (N'K01003', N'Ankit', N'ankit.yadav@mahle.com', N'Production', N'Khandsa', N'Manager'),
  (N'K01013', N'NARESH KUMAR', N'hrd.khd@mahle.com', N'Production', N'Khandsa', N'Engineer'),
  (N'K01028', N'SANGRAM KESHARI SAHOO', N'Sangramkeshari.Sahoo@mahle.com', N'Quality', N'CHENNAI', N'Engineer'),
  (N'K01030', N'Masibur Rahaman', N'Masibur.Rahaman@mahle.com', N'Maintenance', N'Khandsa', N'Assistant Manager'),
  (N'K01069', N'SAHIL', N'', N'Production', N'Parwanoo-1', N'Engineer'),
  (N'K01104', N'Suneel Kumar', N'suneel.kumar@mahle.com', N'Supply Chain', N'Khandsa', N'Sr. Engineer'),
  (N'K01140', N'Rajat Kumar Chakrabarty', N'rajat.chakrabarty@mahle.com', N'After Market', N'Head Office', N'Sr. Engineer'),
  (N'K01144', N'Anil Tiwari', N'anil.tiwari@mahle.com', N'Central Quality', N'Head Office', N'GM'),
  (N'K01146', N'Ishan Arora', N'ishan.a.arora@mahle.com', N'Quality', N'Khandsa', N'Manager'),
  (N'K01149', N'Varun Rana', N'varun.rana@mahle.com', N'Quality', N'Khandsa', N'Asst. Manager'),
  (N'K01151', N'Abhishek Tripathi', N'abhishek.tripathi@mahle.com', N'Quality', N'Khandsa', N'Manager')
) AS source (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
ON target.Emp_No = source.Emp_No
WHEN MATCHED THEN
  UPDATE SET DisplayName = source.DisplayName, Work_Email = source.Work_Email, Department = source.Department, Location = source.Location, Designation = source.Designation
WHEN NOT MATCHED THEN
  INSERT (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
  VALUES (source.Emp_No, source.DisplayName, source.Work_Email, source.Department, source.Location, source.Designation);
GO

MERGE dbo.Employees AS target
USING (VALUES
  (N'K01152', N'Shammy Sharma', N'shammy.sharma@mahle.com', N'Central Quality', N'PUNE', N'Asst. Manager'),
  (N'K01153', N'Tarun Kumar', N'tarun.b.kumar@mahle.com', N'Process Engineering', N'Khandsa', N'Asst. Manager'),
  (N'K01154', N'Rohan Mohata', N'rohan.mohata@mahle.com', N'Process Engineering', N'Khandsa', N'Sr. Engineer'),
  (N'K01162', N'Avaya Kumar Moharana', N'avayakumar.moharana@mahle.com', N'Process Engineering', N'Khandsa', N'Manager'),
  (N'K01163', N'Divya Akhouri', N'divya.akhouri@mahle.com', N'HR', N'Khandsa', N'Sr. Manager'),
  (N'K01164', N'Mantasha Zafar', N'mantasha.zafar@mahle.com', N'HR', N'Khandsa', N'Asst. Manager'),
  (N'K01166', N'Vipin Singh Tomar', N'', N'Maintenance', N'Khandsa', N'Engineer'),
  (N'K01167', N'Ritesh Tiwari', N'ritesh.tiwari@mahle.com', N'Quality', N'Khandsa', N'Sr. Engineer'),
  (N'K01168', N'Rohit Yadav', N'rohit.a.yadav@mahle.com', N'HR', N'Khandsa', N'Assistant Manager'),
  (N'K01169', N'Vishal Singh', N'vishal.a.singh@mahle.com', N'Process Engineering', N'Khandsa', N'Assistant Manager'),
  (N'K01170', N'Rohit Bhatt', N'rohit.bhatt@mahle.com', N'Quality', N'Khandsa', N'Manager'),
  (N'K01171', N'Ajay Yadav', N'ajay.a.yadav@mahle.com', N'SCM', N'Khandsa', N'Sr. Executive'),
  (N'K01172', N'Nitish Kumar', N'', N'Process Engineering', N'Khandsa', N'Assistant Manager'),
  (N'K0350', N'Praveen Kumar', N'praveen.kumar@mahle.com', N'Purchase', N'Khandsa', N'Asst. Manager'),
  (N'K0378', N'Hari Gopal Singh', N'harigopal.singh@mahle.com', N'Production', N'Khandsa', N'Asst. Manager'),
  (N'K0407', N'Rajeshwar Kumar Nishad', N'rajeshwar.nishad@mahle.com', N'Supply Chain', N'Khandsa', N'Asst. Manager'),
  (N'K0433', N'SUNIL KUMAR', N'sunilkumar.dhetarwal@mahle.com', N'Dispatch', N'Khandsa', N'Manager'),
  (N'K0462', N'Akshaya Kumar Sutar', N'akshaya.kumar@mahle.com', N'Supply Chain', N'Khandsa', N'Asst. Manager'),
  (N'K0569', N'Dinesh Kumar Kavrhe', N'dinesh.kavrhe@mahle.com', N'Supply Chain', N'PUNE', N'Asst. Manager'),
  (N'K0577', N'Jaibir Singh', N'jaibir.singh1@mahle.com', N'Maintenance', N'Khandsa', N'Asst. Manager'),
  (N'K0592', N'Manoj Naithani', N'manoj.naithani@mahle.com', N'Finance', N'Head Office', N'DGM'),
  (N'K0610', N'Jitendra Kumar Sahoo', N'jitendra.kumar.sahoo@mahle.com', N'Quality', N'Khandsa', N'Sr. Engineer'),
  (N'K0676', N'RAKESH KUMAR', N'rakesh.f.kumar@mahle.com', N'Production', N'Khandsa', N'Assistant Manager'),
  (N'K0692', N'Pawan Kumar', N'pawan.b.kumar@mahle.com', N'Central Quality', N'Head Office', N'Sr. Engineer'),
  (N'K0693', N'Dinesh Kumar', N'dinesh.a.kumar@mahle.com', N'Quality', N'Khandsa', N'Sr. Engineer'),
  (N'K0713', N'RISHI KUMAR', N'rishi.kumar@mahle.com', N'Supply Chain', N'Khandsa', N'Engineer'),
  (N'K0723', N'SANDEEP KUMAR', N'hrd.khd@mahle.com', N'Production', N'Khandsa', N'Engineer'),
  (N'K0729', N'PAWAN KUMAR', N'hrd.khd@mahle.com', N'Production', N'Khandsa', N'Engineer'),
  (N'K0742', N'Surekha', N'surekha.rohila@mahle.com', N'Maintenance', N'Khandsa', N'Sr. Engineer'),
  (N'K0750', N'SAPNA DEVI', N'sapna.saini@mahle.com', N'HR', N'Khandsa', N'Senior Executive'),
  (N'K0771', N'HARDEEP SINGH', N'hardeep.a.singh@mahle.com', N'Central Purchase', N'Head Office', N'Sr. Engineer'),
  (N'K0773', N'Bijender Singh', N'bijender.c.@mahle.com', N'Production', N'Khandsa', N'Asst. Manager'),
  (N'K0777', N'DIWAN JAMSHED KHAN', N'jamshed.khan@mahle.com', N'EHS', N'Khandsa', N'Sr. Engineer'),
  (N'K0800', N'Ashish Kumar Samantaray', N'Ashish.Samantaray@mahle.com', N'Central Process', N'Head Office', N'Manager'),
  (N'K0822', N'JASBIR SINGH', N'hrd.khd@mahle.com', N'Production', N'Khandsa', N'Engineer'),
  (N'K0826', N'GURMEET SINGH', N'gurmeet.a.singh@mahle.com', N'Production', N'Khandsa', N'Engineer'),
  (N'K0827', N'Prashant Kumar Tiwary', N'prashant.tiwari@mahle.com', N'Maintenance', N'Khandsa', N'Sr. Engineer'),
  (N'K0845', N'Sarika', N'sarika.choudhary@mahle.com', N'Central Quality', N'Head Office', N'Sr. Engineer'),
  (N'K0854', N'Manu Kant', N'manu.kant@mahle.com', N'Maintenance', N'Khandsa', N'Manager'),
  (N'K0856', N'Bhal Singh', N'bhal.singh@mahle.com', N'Central Quality', N'Head Office', N'Manager'),
  (N'K0867', N'AVINASH SINGH MEHRA', N'hrd.khd@mahle.com', N'Production', N'Khandsa', N'Engineer'),
  (N'K0871', N'ANSHUL CHAUHAN', N'anshul.chauhan@mahle.com', N'Supply Chain', N'Head Office', N'Senior Executive'),
  (N'K0915', N'REHAN ALI', N'Rehan.Ali@mahle.com', N'Engineering (R&D)', N'Head Office', N'Engineer'),
  (N'K0920', N'ROHIT KUMAR SHARMA', N'rohit.sharma@mahle.com', N'Maintenance', N'Parwanoo-1', N'Sr. Engineer'),
  (N'K0927', N'AMIT KUMAR', N'hrd.khd@mahle.com', N'Production', N'Khandsa', N'Engineer'),
  (N'K0988', N'Gagandeep Singh', N'gagandeep.a.singh@mahle.com', N'Central Purchase', N'Head Office', N'Manager'),
  (N'KA1092', N'Manju', N'', N'Production', N'Khandsa', N'Engineer'),
  (N'KA1112', N'Bhawana Singh', N'', N'Production', N'Khandsa', N'GET'),
  (N'KA1151', N'Sakshi Upadhyay', N'', N'Production', N'Khandsa', N'GET'),
  (N'KA1235', N'Gaurav', N'Gaurav.Pasrija@mahle.com', N'HR', N'Khandsa', N'Asst. Manager')
) AS source (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
ON target.Emp_No = source.Emp_No
WHEN MATCHED THEN
  UPDATE SET DisplayName = source.DisplayName, Work_Email = source.Work_Email, Department = source.Department, Location = source.Location, Designation = source.Designation
WHEN NOT MATCHED THEN
  INSERT (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
  VALUES (source.Emp_No, source.DisplayName, source.Work_Email, source.Department, source.Location, source.Designation);
GO

MERGE dbo.Employees AS target
USING (VALUES
  (N'KH0083', N'Shalender Yadav', N'Shalender.yadav@mahle.com', N'Central Process', N'Head Office', N'GM'),
  (N'KH0109', N'Dharam Vir Mehra', N'dharamvir.mehra@mahle.com', N'Engineering (R&D)', N'Head Office', N'DGM'),
  (N'KH0130', N'Neeraj Kumar', N'neeraj.kumar@mahle.com', N'Engineering (R&D)', N'Head Office', N'Sr. Manager'),
  (N'KH0142', N'Mahender  KUMAR', N'mahender.kumar@mahle.com', N'Finance', N'Head Office', N'Executive'),
  (N'KH0155', N'Rakesh Kumar', N'rakesh.kumar@mahle.com', N'OPERATIONS', N'Khandsa', N'DGM'),
  (N'KH0183', N'N Suresh Babu', N'suresh.babu@mahle.com', N'After Market', N'Head Office', N'AGM'),
  (N'KH0194', N'S.Nagender', N's.nagender@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0215', N'Gautam Prakash', N'gautam.prakash@mahle.com', N'After Market', N'Head Office', N'Sr. Manager'),
  (N'KH0232', N'Udhvir Singh Bhandari', N'uday.bhandari@mahle.com', N'HR', N'Khandsa', N'Manager'),
  (N'KH0254', N'Ayush Gupta', N'ayush.gupta@mahle.com', N'Central Purchase', N'Head Office', N'AGM'),
  (N'KH0265', N'Nirmal Dhiman', N'nirmal.dhiman@mahle.com', N'Supply Chain', N'Head Office', N'Sr. Manager'),
  (N'KH0286', N'Turlen Jamira Topno', N'turlenjamira.topno@mahle.com', N'Dispatch', N'CHENNAI', N'Asst. Manager'),
  (N'KH0287', N'Surendra  Prajapati', N'surendra.prajapati@mahle.com', N'Quality', N'Khandsa', N'Asst. Manager'),
  (N'KH0289', N'Deepanshu  Kalia', N'deepanshu.kalia@mahle.com', N'Central Process', N'Head Office', N'AGM'),
  (N'KH0308', N'Sajith V P', N'sajith.nair@mahle.com', N'After Market', N'Head Office', N'Manager'),
  (N'KH0311', N'Rajesh Kumar', N'rajesh.kumar1@mahle.com', N'Engineering (R&D)', N'Head Office', N'Assistant Manager'),
  (N'KH0330', N'Devajit Kumar Thakuriah', N'devajit.thakuriah@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0364', N'Shivam Mehta', N'shivam.a.mehta@mahle.com', N'SCM', N'Khandsa', N'Sr. Manager'),
  (N'KH0370', N'Yogesh Kumar Mor', N'yogesh.mor@mahle.com', N'Engineering (R&D)', N'Head Office', N'Manager'),
  (N'KH0389', N'Puneet Singla', N'puneet.singla@mahle.com', N'Engineering (R&D)', N'Head Office', N'GM'),
  (N'KH0396', N'Sk Faizul Haque', N'faizul.haque@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0398', N'Pavan Gedam', N'pavan.gedam@mahle.com', N'Engineering (R&D)', N'Head Office', N'Manager'),
  (N'KH0399', N'Rakesh Kumar', N'rakesh.c.kumar@mahle.com', N'Central Purchase', N'Head Office', N'Sr. Manager'),
  (N'KH0415', N'Manish Sharma', N'manish.sharma@mahle.com', N'Engineering (R&D)', N'Head Office', N'Sr. Manager'),
  (N'KH0420', N'Vinod Kumar Suthar', N'vinod.d.kumar@mahle.com', N'Finance', N'Head Office', N'Manager'),
  (N'KH0438', N'Chander Shekhar', N'Chander.shekhar@mahle.com', N'Engineering (R&D)', N'Head Office', N'Sr. Engineer'),
  (N'KH0449', N'Ajay Chaturvedi', N'ajay.chaturvedi@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0453', N'Paramhans Dhir', N'paramhans.a.dhir@mahle.com', N'HR', N'Head Office', N'Sr. Executive'),
  (N'KH0454', N'Anil Arora', N'anil.a.arora@mahle.com', N'Finance', N'CHENNAI', N'Manager'),
  (N'KH0457', N'Harish Kumar', N'harish.a.kumar@mahle.com', N'Central Quality', N'Head Office', N'Manager'),
  (N'KH0458', N'Vishal Sain', N'vishal.sain@mahle.com', N'OE Marketing', N'Head Office', N'AGM'),
  (N'KH0460', N'Lalit Kumar Verma', N'lalit.verma@mahle.com', N'General Management', N'Head Office', N'GM'),
  (N'KH0470', N'Sheetal Khurana', N'sheetal.khurana@mahle.com', N'After Market', N'Head Office', N'Manager'),
  (N'KH0475', N'Rajesh Saklani', N'rajesh.saklani@mahle.com', N'Finance', N'Head Office', N'Manager'),
  (N'KH0481', N'Mukul Sharma', N'mukul.a.sharma@mahle.com', N'Engineering (R&D)', N'Head Office', N'Asst. Manager'),
  (N'KH0483', N'Abhinav Gandotra', N'abhinav.gandotra@mahle.com', N'Finance', N'Head Office', N'SGM'),
  (N'KH0485', N'Parvesh .', N'parvesh.kumar@mahle.com', N'After Market', N'Head Office', N'Sr. Engineer'),
  (N'KH0495', N'Javed Khan', N'javed.aa.khan@mahle.com', N'Central Purchase', N'Head Office', N'SGM'),
  (N'KH0500', N'Shambhu Das Singh', N'shambhu.singh@mahle.com', N'Engineering (R&D)', N'Head Office', N'Manager'),
  (N'KH0501', N'Madan Mohan Saini', N'madanmohan.a.saini@mahle.com', N'OE Marketing', N'Head Office', N'Manager'),
  (N'KH0503', N'Parmod Kumar', N'parmod.kumar@mahle.com', N'Central Quality', N'Head Office', N'Sr. Engineer'),
  (N'KH0504', N'Ankush Bhan', N'ankush.a.bhan@mahle.com', N'OE Marketing', N'Head Office', N'AGM'),
  (N'KH0510', N'Manish Sharma', N'manish.a.sharma@mahle.com', N'Process Engineering', N'Khandsa', N'Asst. Manager'),
  (N'KH0512', N'Manikannan', N'c.manikannan@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0516', N'Devender Kumar Sharma', N'devender.sharma@mahle.com', N'Engineering (R&D)', N'Head Office', N'Asst. Manager'),
  (N'KH0522', N'Shyam Nandan Kumar', N'shyam.a.nandan@mahle.com', N'Engineering (R&D)', N'Head Office', N'Sr. Manager'),
  (N'KH0527', N'Narender Khatri', N'narender.khatri@mahle.com', N'Engineering (R&D)', N'Head Office', N'Asst. Manager'),
  (N'KH0529', N'Senthilkumar Boominathan', N'Senthilkumar.Boominathan@mahle.com', N'Central Quality', N'Chennai-HO', N'Sr. Engineer'),
  (N'KH0531', N'Viral Rajulal Mali', N'viral.mali@mahle.com', N'Central Process', N'Head Office', N'Manager'),
  (N'KH0532', N'Ramanujan G', N'ramanujan.g@mahle.com', N'Process Engineering', N'CHENNAI', N'Asst. Manager')
) AS source (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
ON target.Emp_No = source.Emp_No
WHEN MATCHED THEN
  UPDATE SET DisplayName = source.DisplayName, Work_Email = source.Work_Email, Department = source.Department, Location = source.Location, Designation = source.Designation
WHEN NOT MATCHED THEN
  INSERT (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
  VALUES (source.Emp_No, source.DisplayName, source.Work_Email, source.Department, source.Location, source.Designation);
GO

MERGE dbo.Employees AS target
USING (VALUES
  (N'KH0535', N'Vaibhav Narendra Goel', N'vaibhav.a.goel@mahle.com', N'After Market', N'Head Office', N'Manager'),
  (N'KH0537', N'Akshay Prabhune', N'akshay.prabhune@mahle.com', N'Finance', N'Head Office', N'Asst. Manager'),
  (N'KH0538', N'P Arun Kumar', N'arunkumar.paramasivam@mahle.com', N'Tooling', N'Head Office', N'Asst. Manager'),
  (N'KH0540', N'Tirath Singh', N'tirath.singh@mahle.com', N'Engineering (R&D)', N'Head Office', N'AGM'),
  (N'KH0542', N'Jagdish Joshi', N'jagdish.joshi@mahle.com', N'Finance', N'Head Office', N'Asst. Manager'),
  (N'KH0544', N'Sanjay Yadav', N'sanjay.b.yadav@mahle.com', N'After Market', N'Head Office', N'GM'),
  (N'KH0545', N'Vikas Kumar', N'vikas.a.kumar@mahle.com', N'Central Purchase', N'Head Office', N'Manager'),
  (N'KH0548', N'Yogesh Yadav', N'yogesh.b.yadav@mahle.com', N'Finance', N'Head Office', N'Assistant Manager'),
  (N'KH0551', N'Prateek Pandey', N'prateek.pandey@mahle.com', N'Central Purchase', N'Head Office', N'Asst. Manager'),
  (N'KH0552', N'Anshul Jain', N'Anshul.a.Jain@mahle.com', N'Finance', N'Head Office', N'Asst. Manager'),
  (N'KH0553', N'Samridhee', N'samridhee.jain@mahle.com', N'Finance', N'Head Office', N'Asst. Manager'),
  (N'KH0554', N'Ashish Kumar', N'ashish.d.kumar@mahle.com', N'Engineering (R&D)', N'Head Office', N'Manager'),
  (N'KH0555', N'PANKAJ KUMAR SAVITA', N'pankajkumar.savita@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0556', N'Madan Lal Jat', N'madan.lal@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0561', N'Rohit Khurana', N'rohit.khurana@mahle.com', N'Central Process', N'Head Office', N'Manager'),
  (N'KH0562', N'Love Kumar', N'love.kumar@mahle.com', N'Finance', N'Head Office', N'Sr. Manager'),
  (N'KH0563', N'Damian Patrick Christhuraj', N'Damian.Patrick@mahle.com', N'Central Quality', N'Chennai-HO', N'Asst. Manager'),
  (N'KH0564', N'Neha Chaurasia', N'neha.chaurasia@mahle.com', N'After Market', N'Head Office', N'Manager'),
  (N'KH0565', N'Suraj Singh', N'suraj.a.singh@mahle.com', N'Finance', N'Head Office', N'Manager'),
  (N'KH0566', N'Saurabh Pratap Singh', N'saurabh.singh@mahle.com', N'Quality', N'Khandsa', N'Sr. Manager'),
  (N'KH0567', N'Anita Kumari', N'anita.kumari@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0570', N'Shivani Tiwari', N'shivani.tiwari@mahle.com', N'Engineering (R&D)', N'Head Office', N'Sr. Engineer'),
  (N'KH0572', N'Aniket Gupta', N'aniket.gupta@mahle.com', N'Engineering (R&D)', N'Head Office', N'Manager'),
  (N'KH0574', N'Amrit Bhambi', N'amrit.bhambi@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0575', N'Deepak Rawat', N'deepak.b.rawat@mahle.com', N'Engineering (R&D)', N'Head Office', N'Manager'),
  (N'KH0576', N'Sushant Sen', N'sushant.sen@mahle.com', N'After Market', N'Head Office', N'Manager'),
  (N'KH0578', N'Ankur Malik', N'ankur.malik@mahle.com', N'Central Purchase', N'Head Office', N'Asst. Manager'),
  (N'KH0579', N'Rajendra Kumar', N'rajendra.c.kumar@mahle.com', N'Supply Chain', N'Head Office', N'Sr. Executive'),
  (N'KH0581', N'Twinkle Shukla', N'twinkle.shukla@mahle.com', N'HR', N'Head Office', N'Sr. Executive'),
  (N'KH0582', N'Vijay Karde', N'vijay.karde@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0585', N'Kunal Bidla', N'kunal.bidla@mahle.com', N'HR', N'Head Office', N'Assistant Manager'),
  (N'KH0587', N'Rakesh Vasudev Patil', N'rakesh.patil@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0588', N'Manish  Kumar', N'manish.c.kumar@mahle.com', N'Engineering (R&D)', N'Head Office', N'Sr. Manager'),
  (N'KH0589', N'Manish Kumar Gupta', N'manish.a.gupta@mahle.com', N'PROJECT MANAGEMENT', N'Head Office', N'Manager'),
  (N'KH0590', N'Debi Prasad Tripathy', N'debiprasad.tripathy@mahle.com', N'Central Purchase', N'Head Office', N'Manager'),
  (N'KH0593', N'Utsav Kumar Singh', N'utsavkumar.singh@mahle.com', N'Central Process', N'Head Office', N'Sr. Engineer'),
  (N'KH0595', N'Kashish Koundal', N'kashish.koundal@mahle.com', N'Finance', N'Head Office', N'Asst. Manager'),
  (N'KH0596', N'Diksha Taori', N'diksha.taori@mahle.com', N'Finance', N'Head Office', N'Sr. Manager'),
  (N'KH0597', N'Anupam Dikshit', N'anupam.dikshit@mahle.com', N'Central Purchase', N'Head Office', N'Sr. Manager'),
  (N'KH0598', N'Rajendra Kumar Jain', N'rk.jain@mahle.com', N'General Management', N'Head Office', N'President - COO'),
  (N'KH0599', N'Chaytali Dass', N'chaytali.a.dass@mahle.com', N'General Management', N'Head Office', N'Sr. Executive'),
  (N'KH0600', N'Chhavi Sharma', N'chhavi.sharma@mahle.com', N'Central Quality', N'Head Office', N'Senior Manager'),
  (N'KH0602', N'Saravanan', N'saravanan.arumugam@mahle.com', N'Tooling', N'Chennai-HO', N'Sr. Engineer'),
  (N'KH0603', N'SATYA PRAKASH SINGH', N'satyaprakash.singh@mahle.com', N'EHS', N'Head Office', N'Sr. Manager'),
  (N'KH0606', N'Neeraj Asgotra', N'neeraj.asgotra@mahle.com', N'Engineering (R&D)', N'Head Office', N'Senior Engineer'),
  (N'KH0607', N'Sanjay Rahangdale', N'sanjay.rahangdale@mahle.com', N'After Market', N'Head Office', N'Assistant Manager'),
  (N'KH0608', N'Abhinav Balwan', N'abhinav.balwan@mahle.com', N'HR', N'Head Office', N'AGM'),
  (N'KH0609', N'Tapash Bera', N'tapash.bera@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0610', N'M Maheshwaran', N'maheshwaran.m@mahle.com', N'OE Marketing', N'Chennai-HO', N'Manager'),
  (N'KH0612', N'Kamlesh Kumar', N'kamlesh.a.kumar@mahle.com', N'Central Quality', N'Chennai-HO', N'Engineer')
) AS source (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
ON target.Emp_No = source.Emp_No
WHEN MATCHED THEN
  UPDATE SET DisplayName = source.DisplayName, Work_Email = source.Work_Email, Department = source.Department, Location = source.Location, Designation = source.Designation
WHEN NOT MATCHED THEN
  INSERT (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
  VALUES (source.Emp_No, source.DisplayName, source.Work_Email, source.Department, source.Location, source.Designation);
GO

MERGE dbo.Employees AS target
USING (VALUES
  (N'KH0614', N'Sandeep .', N'sandeep.thaledi@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0615', N'Laitonjam Manisankar Singha', N'manisankar.singha@mahle.com', N'After Market', N'Head Office', N'Sr. Manager'),
  (N'KH0616', N'Deeksha Rahi', N'diksha.rahi@mahle.com', N'OE Marketing', N'Head Office', N'Asst. Manager'),
  (N'KH0617', N'Vikas Aggarwal', N'vikas.aggarwal@mahle.com', N'Engineering (R&D)', N'Head Office', N'Sr. VP'),
  (N'KH0618', N'Arjun Singh', N'arjun.singh@mahle.com', N'Engineering (R&D)', N'Head Office', N'Sr. Engineer'),
  (N'KH0619', N'Himanshu Vasudeva', N'himanshu.vasudeva@mahle.com', N'Central Process', N'Head Office', N'Manager'),
  (N'KH0620', N'Akib Yunussalim Mansuri', N'akib.mansuri@mahle.com', N'Engineering (R&D)', N'Head Office', N'Asst. Manager'),
  (N'KH0621', N'Mukundam Shirisha', N'mukundam.shirisha@mahle.com', N'Central Process', N'Head Office', N'Senior Engineer'),
  (N'KH0623', N'Manthan .', N'manthan.bakshi@mahle.com', N'Supply Chain', N'Head Office', N'Senior Engineer'),
  (N'KH0624', N'Drishti Miglani', N'drishti.miglani@mahle.com', N'Finance', N'Head Office', N'Asst. Manager'),
  (N'KH0625', N'Manish kumar Sahal', N'manish.sahal@mahle.com', N'Central Purchase', N'Head Office', N'Assistant Manager'),
  (N'KH0627', N'Mukesh Kumar', N'mukesh.b.kumar@mahle.com', N'After Market', N'Head Office', N'Assistant Manager'),
  (N'KH0628', N'Naman Agarwal', N'naman.a.agarwal@mahle.com', N'Finance', N'Head Office', N'Senior Executive'),
  (N'KH0630', N'Nitin Chaudhari', N'nitin.chaudhari@mahle.com', N'After Market', N'Head Office', N'Senior Manager'),
  (N'KH0631', N'Munagala Venkata Leela Sai', N'venkata.leela@mahle.com', N'After Market', N'Head Office', N'Asst. Manager'),
  (N'KH0632', N'Anand Mohan Singh', N'anand.singh@mahle.com', N'After Market', N'Head Office', N'Assistant Manager'),
  (N'KH0633', N'Pragya Singh', N'pragya.singh@mahle.com', N'HR', N'Head Office', N'Senior Manager'),
  (N'KH0634', N'Manisha Kumari', N'manisha.a.kumari@mahle.com', N'Engineering (R&D)', N'Head Office', N'Assistant Manager'),
  (N'KH0635', N'Ruchit Bhardwaj', N'ruchit.bhardwaj@mahle.com', N'Finance', N'Head Office', N'Assistant Manager'),
  (N'KH0637', N'Rekha Sandhu', N'rekha.sandhu@mahle.com', N'HR', N'Head Office', N'SGM'),
  (N'KH0638', N'Lakshita', N'lakshita.solanki@mahle.com', N'Finance', N'Head Office', N'Senior Executive'),
  (N'KH0639', N'Peter K V', N'peter.kv@mahle.com', N'Central Process', N'Chennai-HO', N'Assistant Manager'),
  (N'KH0640', N'Prashant Sahebrao Pawar', N'prashant.pawar@mahle.com', N'OPERATIONS', N'Head Office', N'Senior Vice President'),
  (N'KH0641', N'Arpit Gupta', N'arpit.a.gupta@mahle.com', N'OE Marketing', N'Head Office', N'Sr. GM'),
  (N'KH0642', N'Hit Lal', N'hit.lal@mahle.com', N'Finance', N'Head Office', N'Manager'),
  (N'KH0643', N'M SATRUGHANA PATRA', N'satrughana.patra@mahle.com', N'Central Quality', N'Head Office', N'AM'),
  (N'KH0644', N'DUSHYANT AGARWAL', N'dushyant.agarwal@mahle.com', N'Finance', N'Head Office', N'Manager'),
  (N'KH0645', N'Thiyagranjan Ganesan', N'thiyagarajan.g@mahle.com', N'Central Process', N'Head Office', N'Senior Manager'),
  (N'KH0646', N'Anil Kumar Singh', N'anilkumar.singh@mahle.com', N'SCM', N'Head Office', N'Manager'),
  (N'KH0647', N'Sandeepan Kar', N'sandeepan.kar@mahle.com', N'HR', N'Head Office', N'Senior Manager'),
  (N'KH0648', N'Vijay Tanwani', N'vijay.tanwani@mahle.com', N'Finance', N'Head Office', N'Senior Manager'),
  (N'KH0649', N'YATISH RAJ Y', N'yatish.raj@mahle.com', N'After Market', N'Head Office', N'Assistant Manager'),
  (N'KH0650', N'Rahul Singh Rana', N'rahulsingh.rana@mahle.com', N'Central Quality', N'Head Office', N'Manager'),
  (N'KH0651', N'AASHISH RAI', N'aashish.rai@mahle.com', N'Quality', N'Head Office', N'GET'),
  (N'KH0652', N'Anway Walke', N'anway.walke@mahle.com', N'Engineering (R&D)', N'Head Office', N'Management Trainee'),
  (N'KH0653', N'HARSHA VARDHAN S', N'harsha.vardhan@mahle.com', N'SCM', N'Head Office', N'GET'),
  (N'KH0654', N'Yuvan Chophla', N'', N'Central Process', N'Head Office', N'GET'),
  (N'KH0655', N'Chebolu Pranay', N'', N'Process Engineering', N'Head Office', N'GET')
) AS source (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
ON target.Emp_No = source.Emp_No
WHEN MATCHED THEN
  UPDATE SET DisplayName = source.DisplayName, Work_Email = source.Work_Email, Department = source.Department, Location = source.Location, Designation = source.Designation
WHEN NOT MATCHED THEN
  INSERT (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
  VALUES (source.Emp_No, source.DisplayName, source.Work_Email, source.Department, source.Location, source.Designation);
GO

-- 2. Seed Default Passwords for new employees
MERGE dbo.EmpPasswords AS target
USING (
  SELECT 
    e.Emp_No,
    CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 
      UPPER(RIGHT(e.Emp_No, CASE WHEN LEN(e.Emp_No) >= 4 THEN 4 ELSE LEN(e.Emp_No) END)) + 
      LEFT(REPLACE(e.DisplayName, ' ', ''), 4)
    ), 2) AS PasswordHash
  FROM dbo.Employees e
) AS source
ON target.Emp_No = source.Emp_No
WHEN NOT MATCHED THEN
  INSERT (Emp_No, PasswordHash) VALUES (source.Emp_No, source.PasswordHash);
GO

-- 3. Seed Default Employee Roles
MERGE dbo.EmpRoles AS target
USING (
  SELECT e.Emp_No FROM dbo.Employees e
) AS source
ON target.Emp_No = source.Emp_No
WHEN NOT MATCHED THEN
  INSERT (Emp_No, Role, IsHOD, IsPanelJudge, IsAdmin) VALUES (source.Emp_No, 'employee', 0, 0, 0);
GO
PRINT 'Bulk employee seed completed successfully! Total records: 338';
GO
