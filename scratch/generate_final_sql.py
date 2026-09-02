import re

csv_data = """001332,Shekhar Kanifnath Khedekar,shekhar.khedekar@mahle.com,Production,PUNE,Asst. Manager
001335,Sachin Dhamale C,sachdhamale@mahle.com,Purchase,PUNE,Sr. Engineer
001336,Chopade Bajirao Nana,bajirao.chaupade@mahle.com,Production,PUNE,Engineer
001337,Sanjay Nivruttirao Patode,sanjay.a.patode@mahle.com,Maintenance,PUNE,Sr. Engineer
001351,Sandeep Baburao Malvi,sandeep.malvi@mahle.com,Process Engineering,PUNE,Manager
001656,Polayi Mithun K,mithun.polayi@mahle.com,Engineering (R&D),Head Office,Asst. Manager
001693,Writusree Das,writushree.a.das@mahle.com,Supply Chain,PUNE,Sr. Engineer
001729,Vinesh Kumar Jha,vinesh.jha@mahle.com,Production,PUNE,Engineer
001754,Samanta Arindam,samanta.arindam@mahle.com,Central Quality,PUNE,Sr. Engineer
001806,Jitendra Kumar,,Maintenance,CHENNAI,Engineer
001825,Jogdand Shuddhodhan Yashwant,shuddhodhan.jogdand@mahle.com,Production,PUNE,Engineer
001828,Rajesh Chandrakant Mahangare,rajesh.mahangare@mahle.com,Maintenance,PUNE,Engineer
001914,Prakash Kumar,prakash.a.kumar@mahle.com,Engineering (R&D),PUNE,Engineer
001935,Shivshankar Roy Roy,shivshankar.roy@mahle.com,SCM,PUNE,Sr. Engineer
002028,Santosh Hanumant Mane,santosh.mane@mahle.com,Maintenance,PUNE,Sr. Engineer
002162,Inteqhab Khan,inteqhab.khan@mahle.com,EHS,Parwanoo-1,Sr. Engineer
002234,Shubham Singh,shubham.singh@mahle.com,Supply Chain,PUNE,Sr. Engineer
006505,Shailesh R Nakhate,shailesh.nakhate@mahle.com,Central Purchase,PUNE,Manager
006579,Kumbhar Rahul Yashwant,rahul.kumbhar@mahle.com,OE Marketing,PUNE,Sr. Manager
006637,Jayprakash Manore,jayprakash.a.manore@mahle.com,Production,PUNE,GM
006642,Ravikumar Sharanappa Dinni,Ravikumar.Dinni@mahle.com,Engineering (R&D),PUNE,DGM
006670,Prashant Prakash Tongire,prashant.tongire@mahle.com,Quality,PUNE,Manager
006671,Prashant Chauhan,prashant.chauhan@mahle.com,Supply Chain,Head Office,AGM
006673,Maheswar Pati,maheswar.pati@mahle.com,Finance,PUNE,Manager
006676,Saidutta Dipankar Biswal,dipankar.biswal@mahle.com,Supply Chain,PUNE,Asst. Manager
006681,Rahul Kumar,rahul.c.kumar@mahle.com,PPC,PUNE,Sr. Engineer
006682,Priya ranjan Sahoo,priyaranjan.sahoo@mahle.com,Maintenance,PUNE,Manager
006685,Ganesh Parmeshwar surve,ganesh.surve@mahle.com,Maintenance,PUNE,Sr. Engineer
006687,Sandeep Uttam Shinde,sandip.shinde@mahle.com,HR,PUNE,Sr. Executive
006688,Shubham Kachrudas Sonawane,Shubham.Sonawane@mahle.com,Quality,PUNE,Sr. Engineer
006689,Amol Jijabhau Said,amol.said@mahle.com,Purchase,PUNE,Sr. Engineer
006690,Praveen Basavaraj Balekundri,praveen.balekundri@mahle.com,Engineering (R&D),PUNE,Asst. Manager
006691,Pradeep Shabadi,Pradeep.a.Shabadi@mahle.com,Engineering (R&D),PUNE,Sr. Engineer
006692,Jivan Ramesh Chaudhari,jivan.chaudhari@mahle.com,PROJECT MANAGEMENT,PUNE,Asst. Manager
006694,Prashant Bhaskar Bhusari,Prashant.b.Bhusari@mahle.com,Engineering (R&D),PUNE,Sr. Engineer
006696,Jugnu Kumar Singh,JugnuKumar.Singh@mahle.com,Production,PUNE,Sr. Engineer
006699,Vijay Garimella,vijay.garimella@mahle.com,Production,PUNE,Assistant Manager
006701,Shrinivas Rajendra Shinde,shrinivas.shinde@mahle.com,Process Engineering,PUNE,Sr. Engineer
006703,Ravichandra Appasaheb Mali,ravichandra.mali@mahle.com,Quality,PUNE,Senior Engineer
006706,Abhijit Jaykrishna Deshpande,abhijit.deshpande@mahle.com,PROJECT MANAGEMENT,PUNE,DGM
006707,Tushar Santosh Pawar,tushar.pawar@mahle.com,HR,PUNE,Sr. Manager
006708,Shekhar Shashikant Sankpal,shekhar.sankpal@mahle.com,Quality,PUNE,Sr. Engineer
006709,Dinesh Ramdas Satav,dinesh.satav@mahle.com,Quality,PUNE,Assistant Manager
006711,Akshay Bhagwat Gayakwad,akshay.gayakwad@mahle.com,Central Quality,PUNE,Sr. Engineer
006712,Aarti Ganpatrao Shinde,aarti.shinde@mahle.com,SCM,PUNE,Sr. Manager
006713,Mihir Vivek Ratnakar,mihir.ratnakar@mahle.com,EHS,PUNE,Sr. Engineer
1002,Palani Ashokan,p.ashokan@mahle.com,Process Engineering,CHENNAI,Sr. Manager
1009,N Prem Kumar,n.premkumar@mahle.com,Tooling,CHENNAI,Sr. Manager
1027,B Vasantha Kumar,vasanthakumar.baskaran@mahle.com,Central Process,CHENNAI,AGM
1030,K P Arun,arun.narayanan@mahle.com,Central Process,Chennai-HO,Manager
1031,R Shankar,shankar.rajendran@mahle.com,PROJECT MANAGEMENT,Chennai-HO,Sr. Manager
1033,Sunil KUMAR,Sunilkumar.veersingh@mahle.com,Production,Khandsa,Asst. Manager
1048,Raja R,raja.rajaram@mahle.com,Production,CHENNAI,Manager
1052,Sanjeevi Kumar,sanjeevi.kumar@mahle.com,SCM,CHENNAI,Sr. Manager
1077,Vijayaraghavan M,vijayaraghavan.muralidharan@mahle.com,Supply Chain,CHENNAI,Asst. Manager
1078,K Sheik Jamaludeen,sheik.jamaludeen@mahle.com,Maintenance,CHENNAI,Assistant Manager
1084,Ramkumar P,ramkumar.palanivel@mahle.com,Tooling,CHENNAI,Asst. Manager
1088,Sowrimuthu A,chennai.maintenance@mahle.com,Maintenance,CHENNAI,Engineer
1089,T Madhavan,madhavan.thangaraj@mahle.com,Purchase,CHENNAI,Asst. Manager
1092,Sridhar K,sridhar.kannan@mahle.com,Production,CHENNAI,Sr. Manager
1098,Kumaravel Ranganathan,kumaravel.ranganathan@mahle.com,Production,CHENNAI,Asst. Manager
1099,V S Mohan Kumar,mohan.a.kumar@mahle.com,Maintenance,CHENNAI,Asst. Manager
1105,Kalyanasundaram T,kalyanasundaram.t@mahle.com,Process Engineering,CHENNAI,Senior Engineer
1107,Sai Ganesh H,saiganesh.h@mahle.com,Process Engineering,CHENNAI,Senior Engineer
1108,Shyam Babu S,shyambabu.s@mahle.com,Quality,CHENNAI,Asst. Manager
1109,Mareeswaran T,mareeswaran.t@mahle.com,HR,CHENNAI,Manager
1110,Arun kumar R,arunkumar.r@mahle.com,Safety,CHENNAI,Sr. Engineer
1112,Keerthivel,,Tooling,CHENNAI,Engineer
1113,Godha Yeshwanth Goud,yeshwanth.a.goud@mahle.com,Process Engineering,CHENNAI,Senior Engineer
1114,Nancy Y,nancy.y@mahle.com,HR,CHENNAI,Assistant Manager
1116,Vinayagam V,,Maintenance,CHENNAI,Engineer
1117, Srinivasan Lakshmanaperumal,,Process Engineering,CHENNAI,Sr. Engineer
1118,Rahuman N,,Maintenance,CHENNAI,Engineer
1119,Mikhail Prabhudas N,mikhailprabhudas.n@mahle.com,Quality,CHENNAI,Assistant Manager
1120,Jeyavelu N,jeyavelu.n@mahle.com,Maintenance,CHENNAI,Assistant Manager 
1121,Sathish Kumar,sathishkumar.b@mahle.com,Quality,CHENNAI,Assistant Manager 
1122,Vivin TS,vivin.ts@mahle.com,Process Engineering,CHENNAI,Assistant Manager
1123,Murugananthan A,,Maintenance,CHENNAI,Senior Engineer
6007,R Kumaresan,kumaresan.ramachandran@mahle.com,Quality,CHENNAI,Manager
6009,Kulandai Veeramakali R,veera.rajendran@mahle.com,Supply Chain,CHENNAI,Sr. Engineer
6074,G Anitha,anitha.ganesan@mahle.com,Supply Chain,CHENNAI,Engineer
6096,Praveen Kumar,Praveenkumar.Selvaraj@mahle.com,Tooling,CHENNAI,Engineer
6126,Korapati Yesanna,korapati.yesanna@mahle.com,Quality,CHENNAI,Engineer
6139,Subramani,subramani.shanmugavel@mahle.com,Production,CHENNAI,Sr. Engineer
6165,M.Rathinavel,,Production,CHENNAI,Engineer
6187,Sasikumar Marimuthu ,Sasikumar.Marimuthu@mahle.com,Quality,CHENNAI,Engineer
6215,Dibyendu chakraborty,Dibyendu.Chakraborty@mahle.com,Engineering (R&D),PUNE,Engineer
8021,Asif Aziz TP,asif.aziz@mahle.com,Central Quality,Chennai-HO,Engineer
8409,Sivaperumal,,Production,CHENNAI,Engineer
8411,Gokulakrishnan Sankar,,Production,CHENNAI,Asst. Engineer
8412,R Vignesh,,Production,CHENNAI,Asst. Engineer
8413,Shubhadip Jana,,Production,CHENNAI,Asst. Engineer
E20067,Laxmi Prakash Pradhan,laxmi.pradhan@mahle.com,Production,Parwanoo-1,DGM
E20070,Deepak Jangra,deepak.jangra@mahle.com,Central Quality,Head Office,AGM
E20089,Kamal Kumar Panda,kamal.panda@mahle.com,Central Process,CHENNAI,DGM
E20196,Raju Kumar Yadav,raju.yadav@mahle.com,Quality,Khandsa,Senior Engineer
E40002,Anil Banta,anil.banta@mahle.com,After Market,Parwanoo-1,DGM
E40007,Anuj Chauhan,anuj.chauhan@mahle.com,Engineering (R&D),Parwanoo-1,Asst. Manager
E40022,Banita Chaudhary,banita.chaudhary@mahle.com,Production,Parwanoo-1,Engineer
E40032,Deepinder Singh,Deepinder.singh@mahle.com,Engineering (R&D),Head Office,Engineer
E40041,Ishita Bodh,ishita.bodh@mahle.com,Central Process,Head Office,Sr. Engineer
E40053,Mohit Singla,mohit.singla@mahle.com,Central Purchase,Head Office,AGM
E40055,Mohan Sharma,mohan.sharma@mahle.com,Process,Parwanoo-1,Asst. Manager
E40065,Nishant Prasher,nishant.prasher@mahle.com,SCM,Parwanoo-1,Engineer
E40069,Pradeep Thakur,pradeep.thakur@mahle.com,Quality,Parwanoo-1,Asst. Manager
E40073,Pankush Kumar,pankush.kumar@mahle.com,Production,Parwanoo-1,Manager
E40074,Ravinder Singh Bajwa,ravinder.bajwa@mahle.com,Finance,Head Office,Sr. Manager
E40075,Reena Sharma,reena.sharma@mahle.com,Quality,Parwanoo-1,Manager
E40082,Robin Pant,robpant@mahle.com,SCM,Parwanoo-1,Manager
E40090,Shahnawaz Hussain,molvi.shahnawaj@mahle.com,After Market,Parwanoo-1,Manager
E40093,Sanju Kumar,sanju.kumar@mahle.com,Process Engineering,Khandsa,Asst. Manager
E40100,Sorabh Kalia,sorabh.kalia@mahle.com,Supply Chain,Parwanoo-1,Asst. Manager
E40101,Sanjesh Chauhan,sanjesh.chauhan@mahle.com,Process Engineering,Parwanoo-1,Manager
E40103,Tinku Jangra,Tinku.jangra@mahle.com,Supply Chain,Parwanoo-1,Asst. Manager
E40209,Asha Kumari,asha.sharma@mahle.com,Supply Chain,Khandsa,Sr. Engineer
E40292,Deepak Sharma,deepak.b.sharma@mahle.com,Quality,Parwanoo-1,Sr. Engineer
E40297,Pawan Kumar,Pawan.c.Kumar@mahle.com,Central Quality,Parwanoo-1,Engineer
E40370,Manisha Kumari,manisha.kumari@mahle.com,Quality,Parwanoo-1,Engineer
E50002,Ashok Kumar Tanwar,ashok.tanwar@mahle.com,Finance,Parwanoo-1,Sr. Manager
E50003,Ankush Kumar,ankush.chauhan@mahle.com,Purchase,Parwanoo-1,Asst. Manager
E50013,Deepak Goyal,deepak.goyal@mahle.com,Central Purchase,Head Office,AGM
E50037,Naresh Kumar,naresh.kumar@mahle.com,Maintenance,Parwanoo-1,Manager
E50039,Puneet Kumar,puneet.a.kumar@mahle.com,Production,Khandsa,Sr. Engineer
E50045,Satish Kumar Bhardwaj,satish.bhardwaj@mahle.com,Production,Parwanoo-1,Sr. Engineer
E50076,Arun Chauhan,arun.chauhan@mahle.com,Production,Parwanoo-1,Sr. Engineer
E50108,Jagbeer Singh,,Production,Parwanoo-1,Engineer
E50135,Puneet Bhardwaj,Puneet.Bhardwaj@mahle.com,Production,Parwanoo-1,Engineer
E50162,Shashi Kumar,,Production,Parwanoo-1,Engineer
E50203,Yogesh Kumar,yogesh.kumar@mahle.com,Maintenance,Parwanoo-1,Sr. Engineer
E50278,Anil Sharma,puneet.a.kumar@mahle.com,Production,Khandsa,Engineer
E50322,Sudhir Rai,,Production,Khandsa,Engineer
E50332,Deepak Sharma,deepak.c.sharma@mahle.com,Quality,Parwanoo-1,Engineer
E50396,Mandeep Agan,mandeep.a.agan@mahle.com,Quality,Khandsa,Engineer
E50432,Ankur,ankur.b.kumar@mahle.com,HR,Parwanoo-1,Asst. Manager
E50433,Ramneek Sharma,ramneek.a.sharma@mahle.com,Quality,Parwanoo-1,Asst. Manager
E50438,Parul Walia,parul.walia@mahle.com,HR,Parwanoo-1,Manager
K0060,Manoj Yadav,manoj.yadav@mahle.com,Supply Chain,Khandsa,Asst. Manager
K0075,Preeti Bhatia,preeti.bhatia@mahle.com,Central Quality,Head Office,Sr. Engineer
K0099,Poonam Saini,poonam.saini@mahle.com,Central Quality,Head Office,Asst. Manager
K01003,Ankit,ankit.yadav@mahle.com,Production,Khandsa,Manager
K01013,NARESH KUMAR,hrd.khd@mahle.com,Production,Khandsa,Engineer
K01028,SANGRAM KESHARI SAHOO,Sangramkeshari.Sahoo@mahle.com,Quality,CHENNAI,Engineer
K01030,Masibur Rahaman,Masibur.Rahaman@mahle.com,Maintenance,Khandsa,Assistant Manager
K01069,SAHIL,,Production,Parwanoo-1,Engineer
K01104,Suneel Kumar,suneel.kumar@mahle.com,Supply Chain,Khandsa,Sr. Engineer
K01140,Rajat Kumar Chakrabarty,rajat.chakrabarty@mahle.com,After Market,Head Office,Sr. Engineer
K01144,Anil Tiwari,anil.tiwari@mahle.com,Central Quality,Head Office,GM
K01146,Ishan Arora,ishan.a.arora@mahle.com,Quality,Khandsa,Manager
K01149,Varun Rana,varun.rana@mahle.com,Quality,Khandsa,Asst. Manager
K01151,Abhishek Tripathi,abhishek.tripathi@mahle.com,Quality,Khandsa,Manager
K01152,Shammy Sharma,shammy.sharma@mahle.com,Central Quality,PUNE,Asst. Manager
K01153,Tarun Kumar,tarun.b.kumar@mahle.com,Process Engineering,Khandsa,Asst. Manager
K01154,Rohan Mohata,rohan.mohata@mahle.com,Process Engineering,Khandsa,Sr. Engineer
K01162,Avaya Kumar Moharana,avayakumar.moharana@mahle.com,Process Engineering,Khandsa,Manager
K01163,Divya Akhouri,divya.akhouri@mahle.com,HR,Khandsa,Sr. Manager
K01164,Mantasha Zafar,mantasha.zafar@mahle.com,HR,Khandsa,Asst. Manager
K01166,Vipin Singh Tomar,,Maintenance,Khandsa,Engineer
K01167,Ritesh Tiwari,ritesh.tiwari@mahle.com,Quality,Khandsa,Sr. Engineer
K01168,Rohit Yadav,rohit.a.yadav@mahle.com,HR,Khandsa,Assistant Manager
K01169,Vishal Singh,vishal.a.singh@mahle.com,Process Engineering,Khandsa,Assistant Manager
K01170,Rohit Bhatt,rohit.bhatt@mahle.com,Quality,Khandsa,Manager
K01171,Ajay Yadav,ajay.a.yadav@mahle.com,SCM,Khandsa,Sr. Executive
K01172,Nitish Kumar,,Process Engineering,Khandsa,Assistant Manager
K0350,Praveen Kumar,praveen.kumar@mahle.com,Purchase,Khandsa,Asst. Manager
K0378,Hari Gopal Singh,harigopal.singh@mahle.com,Production,Khandsa,Asst. Manager
K0407,Rajeshwar Kumar Nishad,rajeshwar.nishad@mahle.com,Supply Chain,Khandsa,Asst. Manager
K0433,SUNIL KUMAR,sunilkumar.dhetarwal@mahle.com,Dispatch,Khandsa,Manager
K0462,Akshaya Kumar Sutar,akshaya.kumar@mahle.com,Supply Chain,Khandsa,Asst. Manager
K0569,Dinesh Kumar Kavrhe,dinesh.kavrhe@mahle.com,Supply Chain,PUNE,Asst. Manager
K0577,Jaibir Singh,jaibir.singh1@mahle.com,Maintenance,Khandsa,Asst. Manager
K0592,Manoj Naithani,manoj.naithani@mahle.com,Finance,Head Office,DGM
K0610,Jitendra Kumar Sahoo,jitendra.kumar.sahoo@mahle.com,Quality,Khandsa,Sr. Engineer
K0676,RAKESH KUMAR,rakesh.f.kumar@mahle.com,Production,Khandsa,Assistant Manager
K0692,Pawan Kumar,pawan.b.kumar@mahle.com,Central Quality,Head Office,Sr. Engineer
K0693,Dinesh Kumar,dinesh.a.kumar@mahle.com,Quality,Khandsa,Sr. Engineer
K0713,RISHI KUMAR,rishi.kumar@mahle.com,Supply Chain,Khandsa,Engineer
K0723,SANDEEP KUMAR,hrd.khd@mahle.com,Production,Khandsa,Engineer
K0729,PAWAN KUMAR,hrd.khd@mahle.com,Production,Khandsa,Engineer
K0742,Surekha,surekha.rohila@mahle.com,Maintenance,Khandsa,Sr. Engineer
K0750,SAPNA DEVI,sapna.saini@mahle.com,HR,Khandsa,Senior Executive
K0771,HARDEEP SINGH,hardeep.a.singh@mahle.com,Central Purchase,Head Office,Sr. Engineer
K0773,Bijender Singh,bijender.c.@mahle.com,Production,Khandsa,Asst. Manager
K0777,DIWAN JAMSHED KHAN,jamshed.khan@mahle.com,EHS,Khandsa,Sr. Engineer
K0800,Ashish Kumar Samantaray,Ashish.Samantaray@mahle.com,Central Process,Head Office,Manager
K0822,JASBIR SINGH,hrd.khd@mahle.com,Production,Khandsa,Engineer
K0826,GURMEET SINGH,gurmeet.a.singh@mahle.com,Production,Khandsa,Engineer
K0827,Prashant Kumar Tiwary,prashant.tiwari@mahle.com,Maintenance,Khandsa,Sr. Engineer
K0845,Sarika,sarika.choudhary@mahle.com,Central Quality,Head Office,Sr. Engineer
K0854,Manu Kant,manu.kant@mahle.com,Maintenance,Khandsa,Manager
K0856,Bhal Singh,bhal.singh@mahle.com,Central Quality,Head Office,Manager
K0867,AVINASH SINGH MEHRA,hrd.khd@mahle.com,Production,Khandsa,Engineer
K0871,ANSHUL CHAUHAN,anshul.chauhan@mahle.com,Supply Chain,Head Office,Senior Executive
K0915,REHAN ALI,Rehan.Ali@mahle.com,Engineering (R&D),Head Office,Engineer
K0920,ROHIT KUMAR SHARMA,rohit.sharma@mahle.com,Maintenance,Parwanoo-1,Sr. Engineer
K0927,AMIT KUMAR,hrd.khd@mahle.com,Production,Khandsa,Engineer
K0988,Gagandeep Singh,gagandeep.a.singh@mahle.com,Central Purchase,Head Office,Manager
KA1092,Manju,,Production,Khandsa,Engineer
KA1112,Bhawana Singh,,Production,Khandsa,GET
KA1151,Sakshi Upadhyay,,Production,Khandsa,GET
KA1235,Gaurav,Gaurav.Pasrija@mahle.com,HR,Khandsa,Asst. Manager
KH0083,Shalender Yadav,Shalender.yadav@mahle.com,Central Process,Head Office,GM
KH0109,Dharam Vir Mehra,dharamvir.mehra@mahle.com,Engineering (R&D),Head Office,DGM
KH0130,Neeraj Kumar,neeraj.kumar@mahle.com,Engineering (R&D),Head Office,Sr. Manager
KH0142,Mahender  KUMAR,mahender.kumar@mahle.com,Finance,Head Office,Executive
KH0155,Rakesh Kumar,rakesh.kumar@mahle.com,OPERATIONS,Khandsa,DGM
KH0183,N Suresh Babu,suresh.babu@mahle.com,After Market,Head Office,AGM
KH0194,S.Nagender,s.nagender@mahle.com,After Market,Head Office,Asst. Manager
KH0215,Gautam Prakash,gautam.prakash@mahle.com,After Market,Head Office,Sr. Manager
KH0232,Udhvir Singh Bhandari,uday.bhandari@mahle.com,HR,Khandsa,Manager
KH0254,Ayush Gupta,ayush.gupta@mahle.com,Central Purchase,Head Office,AGM
KH0265,Nirmal Dhiman,nirmal.dhiman@mahle.com,Supply Chain,Head Office,Sr. Manager
KH0286,Turlen Jamira Topno,turlenjamira.topno@mahle.com,Dispatch,CHENNAI,Asst. Manager
KH0287,Surendra  Prajapati,surendra.prajapati@mahle.com,Quality,Khandsa,Asst. Manager
KH0289,Deepanshu  Kalia,deepanshu.kalia@mahle.com,Central Process,Head Office,AGM
KH0308,Sajith V P,sajith.nair@mahle.com,After Market,Head Office,Manager
KH0311,Rajesh Kumar,rajesh.kumar1@mahle.com,Engineering (R&D),Head Office,Assistant Manager
KH0330,Devajit Kumar Thakuriah,devajit.thakuriah@mahle.com,After Market,Head Office,Asst. Manager
KH0364,Shivam Mehta,shivam.a.mehta@mahle.com,SCM,Khandsa,Sr. Manager
KH0370,Yogesh Kumar Mor,yogesh.mor@mahle.com,Engineering (R&D),Head Office,Manager
KH0389,Puneet Singla,puneet.singla@mahle.com,Engineering (R&D),Head Office,GM
KH0396,Sk Faizul Haque,faizul.haque@mahle.com,After Market,Head Office,Asst. Manager
KH0398,Pavan Gedam,pavan.gedam@mahle.com,Engineering (R&D),Head Office,Manager
KH0399,Rakesh Kumar,rakesh.c.kumar@mahle.com,Central Purchase,Head Office,Sr. Manager
KH0415,Manish Sharma,manish.sharma@mahle.com,Engineering (R&D),Head Office,Sr. Manager
KH0420,Vinod Kumar Suthar,vinod.d.kumar@mahle.com,Finance,Head Office,Manager
KH0438,Chander Shekhar,Chander.shekhar@mahle.com,Engineering (R&D),Head Office,Sr. Engineer
KH0449,Ajay Chaturvedi,ajay.chaturvedi@mahle.com,After Market,Head Office,Asst. Manager
KH0453,Paramhans Dhir,paramhans.a.dhir@mahle.com,HR,Head Office,Sr. Executive
KH0454,Anil Arora,anil.a.arora@mahle.com,Finance,CHENNAI,Manager
KH0457,Harish Kumar,harish.a.kumar@mahle.com,Central Quality,Head Office,Manager
KH0458,Vishal Sain,vishal.sain@mahle.com,OE Marketing,Head Office,AGM
KH0460,Lalit Kumar Verma,lalit.verma@mahle.com,General Management,Head Office,GM
KH0470,Sheetal Khurana,sheetal.khurana@mahle.com,After Market,Head Office,Manager
KH0475,Rajesh Saklani,rajesh.saklani@mahle.com,Finance,Head Office,Manager
KH0481,Mukul Sharma,mukul.a.sharma@mahle.com,Engineering (R&D),Head Office,Asst. Manager
KH0483,Abhinav Gandotra,abhinav.gandotra@mahle.com,Finance,Head Office,SGM
KH0485,Parvesh .,parvesh.kumar@mahle.com,After Market,Head Office,Sr. Engineer
KH0495,Javed Khan,javed.aa.khan@mahle.com,Central Purchase,Head Office,SGM
KH0500,Shambhu Das Singh,shambhu.singh@mahle.com,Engineering (R&D),Head Office,Manager
KH0501,Madan Mohan Saini,madanmohan.a.saini@mahle.com,OE Marketing,Head Office,Manager
KH0503,Parmod Kumar,parmod.kumar@mahle.com,Central Quality,Head Office,Sr. Engineer
KH0504,Ankush Bhan,ankush.a.bhan@mahle.com,OE Marketing,Head Office,AGM
KH0510,Manish Sharma,manish.a.sharma@mahle.com,Process Engineering,Khandsa,Asst. Manager
KH0512,Manikannan,c.manikannan@mahle.com,After Market,Head Office,Asst. Manager
KH0516,Devender Kumar Sharma,devender.sharma@mahle.com,Engineering (R&D),Head Office,Asst. Manager
KH0522,Shyam Nandan Kumar,shyam.a.nandan@mahle.com,Engineering (R&D),Head Office,Sr. Manager
KH0527,Narender Khatri,narender.khatri@mahle.com,Engineering (R&D),Head Office,Asst. Manager
KH0529,Senthilkumar Boominathan,Senthilkumar.Boominathan@mahle.com,Central Quality,Chennai-HO,Sr. Engineer
KH0531,Viral Rajulal Mali,viral.mali@mahle.com,Central Process,Head Office,Manager
KH0532,Ramanujan G,ramanujan.g@mahle.com,Process Engineering,CHENNAI,Asst. Manager
KH0535,Vaibhav Narendra Goel,vaibhav.a.goel@mahle.com,After Market,Head Office,Manager
KH0537,Akshay Prabhune,akshay.prabhune@mahle.com,Finance,Head Office,Asst. Manager
KH0538,P Arun Kumar,arunkumar.paramasivam@mahle.com,Tooling,Head Office,Asst. Manager
KH0540,Tirath Singh,tirath.singh@mahle.com,Engineering (R&D),Head Office,AGM
KH0542,Jagdish Joshi,jagdish.joshi@mahle.com,Finance,Head Office,Asst. Manager
KH0544,Sanjay Yadav,sanjay.b.yadav@mahle.com,After Market,Head Office,GM
KH0545,Vikas Kumar,vikas.a.kumar@mahle.com,Central Purchase,Head Office,Manager
KH0548,Yogesh Yadav,yogesh.b.yadav@mahle.com,Finance,Head Office,Assistant Manager
KH0551,Prateek Pandey,prateek.pandey@mahle.com,Central Purchase,Head Office,Asst. Manager
KH0552,Anshul Jain,Anshul.a.Jain@mahle.com,Finance,Head Office,Asst. Manager
KH0553,Samridhee,samridhee.jain@mahle.com,Finance,Head Office,Asst. Manager
KH0554,Ashish Kumar,ashish.d.kumar@mahle.com,Engineering (R&D),Head Office,Manager
KH0555,PANKAJ KUMAR SAVITA,pankajkumar.savita@mahle.com,After Market,Head Office,Asst. Manager
KH0556,Madan Lal Jat,madan.lal@mahle.com,After Market,Head Office,Asst. Manager
KH0561,Rohit Khurana,rohit.khurana@mahle.com,Central Process,Head Office,Manager
KH0562,Love Kumar,love.kumar@mahle.com,Finance,Head Office,Sr. Manager
KH0563,Damian Patrick Christhuraj,Damian.Patrick@mahle.com,Central Quality,Chennai-HO,Asst. Manager
KH0564,Neha Chaurasia,neha.chaurasia@mahle.com,After Market,Head Office,Manager
KH0565,Suraj Singh,suraj.a.singh@mahle.com,Finance,Head Office,Manager
KH0566,Saurabh Pratap Singh,saurabh.singh@mahle.com,Quality,Khandsa,Sr. Manager
KH0567,Anita Kumari,anita.kumari@mahle.com,After Market,Head Office,Asst. Manager
KH0570,Shivani Tiwari,shivani.tiwari@mahle.com,Engineering (R&D),Head Office,Sr. Engineer
KH0572,Aniket Gupta,aniket.gupta@mahle.com,Engineering (R&D),Head Office,Manager
KH0574,Amrit Bhambi,amrit.bhambi@mahle.com,After Market,Head Office,Asst. Manager
KH0575,Deepak Rawat,deepak.b.rawat@mahle.com,Engineering (R&D),Head Office,Manager
KH0576,Sushant Sen,sushant.sen@mahle.com,After Market,Head Office,Manager
KH0578,Ankur Malik,ankur.malik@mahle.com,Central Purchase,Head Office,Asst. Manager
KH0579,Rajendra Kumar,rajendra.c.kumar@mahle.com,Supply Chain,Head Office,Sr. Executive
KH0581,Twinkle Shukla,twinkle.shukla@mahle.com,HR,Head Office,Sr. Executive
KH0582,Vijay Karde,vijay.karde@mahle.com,After Market,Head Office,Asst. Manager
KH0585,Kunal Bidla,kunal.bidla@mahle.com,HR,Head Office,Assistant Manager
KH0587,Rakesh Vasudev Patil,rakesh.patil@mahle.com,After Market,Head Office,Asst. Manager
KH0588,Manish  Kumar,manish.c.kumar@mahle.com,Engineering (R&D),Head Office,Sr. Manager
KH0589,Manish Kumar Gupta,manish.a.gupta@mahle.com,PROJECT MANAGEMENT,Head Office,Manager
KH0590,Debi Prasad Tripathy,debiprasad.tripathy@mahle.com,Central Purchase,Head Office,Manager
KH0593,Utsav Kumar Singh,utsavkumar.singh@mahle.com,Central Process,Head Office,Sr. Engineer
KH0595,Kashish Koundal,kashish.koundal@mahle.com,Finance,Head Office,Asst. Manager
KH0596,Diksha Taori,diksha.taori@mahle.com,Finance,Head Office,Sr. Manager
KH0597,Anupam Dikshit,anupam.dikshit@mahle.com,Central Purchase,Head Office,Sr. Manager
KH0598,Rajendra Kumar Jain,rk.jain@mahle.com,General Management,Head Office,President - COO
KH0599,Chaytali Dass,chaytali.a.dass@mahle.com,General Management,Head Office,Sr. Executive
KH0600,Chhavi Sharma,chhavi.sharma@mahle.com,Central Quality,Head Office,Senior Manager
KH0602,Saravanan,saravanan.arumugam@mahle.com,Tooling,Chennai-HO,Sr. Engineer
KH0603,SATYA PRAKASH SINGH,satyaprakash.singh@mahle.com,EHS,Head Office,Sr. Manager
KH0606,Neeraj Asgotra,neeraj.asgotra@mahle.com,Engineering (R&D),Head Office,Senior Engineer
KH0607,Sanjay Rahangdale,sanjay.rahangdale@mahle.com,After Market,Head Office,Assistant Manager
KH0608,Abhinav Balwan,abhinav.balwan@mahle.com,HR,Head Office,AGM
KH0609,Tapash Bera,tapash.bera@mahle.com,After Market,Head Office,Asst. Manager
KH0610,M Maheshwaran,maheshwaran.m@mahle.com,OE Marketing,Chennai-HO,Manager
KH0612,Kamlesh Kumar,kamlesh.a.kumar@mahle.com,Central Quality,Chennai-HO,Engineer
KH0614,Sandeep .,sandeep.thaledi@mahle.com,After Market,Head Office,Asst. Manager
KH0615,Laitonjam Manisankar Singha,manisankar.singha@mahle.com,After Market,Head Office,Sr. Manager
KH0616,Deeksha Rahi,diksha.rahi@mahle.com,OE Marketing,Head Office,Asst. Manager
KH0617,Vikas Aggarwal,vikas.aggarwal@mahle.com,Engineering (R&D),Head Office,Sr. VP
KH0618,Arjun Singh,arjun.singh@mahle.com,Engineering (R&D),Head Office,Sr. Engineer
KH0619,Himanshu Vasudeva,himanshu.vasudeva@mahle.com,Central Process,Head Office,Manager
KH0620,Akib Yunussalim Mansuri,akib.mansuri@mahle.com,Engineering (R&D),Head Office,Asst. Manager
KH0621,Mukundam Shirisha,mukundam.shirisha@mahle.com,Central Process,Head Office,Senior Engineer
KH0623,Manthan .,manthan.bakshi@mahle.com,Supply Chain,Head Office,Senior Engineer
KH0624,Drishti Miglani,drishti.miglani@mahle.com,Finance,Head Office,Asst. Manager
KH0625,Manish kumar Sahal,manish.sahal@mahle.com,Central Purchase,Head Office,Assistant Manager
KH0627,Mukesh Kumar,mukesh.b.kumar@mahle.com,After Market,Head Office,Assistant Manager
KH0628,Naman Agarwal,naman.a.agarwal@mahle.com,Finance,Head Office,Senior Executive
KH0630,Nitin Chaudhari,nitin.chaudhari@mahle.com,After Market,Head Office,Senior Manager
KH0631,Munagala Venkata Leela Sai,venkata.leela@mahle.com,After Market,Head Office,Asst. Manager
KH0632,Anand Mohan Singh,anand.singh@mahle.com,After Market,Head Office,Assistant Manager
KH0633,Pragya Singh,pragya.singh@mahle.com,HR,Head Office,Senior Manager
KH0634,Manisha Kumari,manisha.a.kumari@mahle.com,Engineering (R&D),Head Office,Assistant Manager
KH0635,Ruchit Bhardwaj,ruchit.bhardwaj@mahle.com,Finance,Head Office,Assistant Manager
KH0637,Rekha Sandhu,rekha.sandhu@mahle.com,HR,Head Office,SGM
KH0638,Lakshita,lakshita.solanki@mahle.com,Finance,Head Office,Senior Executive
KH0639,Peter K V,peter.kv@mahle.com,Central Process,Chennai-HO,Assistant Manager
KH0640,Prashant Sahebrao Pawar,prashant.pawar@mahle.com,OPERATIONS,Head Office,Senior Vice President
KH0641,Arpit Gupta,arpit.a.gupta@mahle.com,OE Marketing,Head Office,Sr. GM
KH0642,Hit Lal,hit.lal@mahle.com,Finance,Head Office,Manager
KH0643,M SATRUGHANA PATRA,satrughana.patra@mahle.com,Central Quality,Head Office,AM
KH0644,DUSHYANT AGARWAL,dushyant.agarwal@mahle.com,Finance,Head Office,Manager
KH0645,Thiyagranjan Ganesan,thiyagarajan.g@mahle.com,Central Process,Head Office,Senior Manager
KH0646,Anil Kumar Singh,anilkumar.singh@mahle.com,SCM,Head Office,Manager
KH0647,Sandeepan Kar,sandeepan.kar@mahle.com,HR,Head Office,Senior Manager
KH0648,Vijay Tanwani,vijay.tanwani@mahle.com,Finance,Head Office,Senior Manager
KH0649,YATISH RAJ Y,yatish.raj@mahle.com,After Market,Head Office,Assistant Manager
KH0650,Rahul Singh Rana,rahulsingh.rana@mahle.com,Central Quality,Head Office,Manager
KH0651,AASHISH RAI,aashish.rai@mahle.com,Quality,Head Office,GET
KH0652,Anway Walke,anway.walke@mahle.com,Engineering (R&D),Head Office,Management Trainee
KH0653,HARSHA VARDHAN S,harsha.vardhan@mahle.com,SCM,Head Office,GET
KH0654,Yuvan Chophla,,Central Process,Head Office,GET
KH0655,Chebolu Pranay,,Process Engineering,Head Office,GET"""

# HOD assignments:
# HR - Rekha Sandhu (KH0637)
# Finance & IT - Abhinav Gandotra (KH0483)
# SCM - Prashant Chauhan (006671)
# Central Quality - Anil Tiwari (K01144)
# General Management & Operations - RK Jain (KH0598)
# Sales & Applications - Arpit Gupta (KH0641)
# R&D - Vikas Aggarwal (KH0617)
# Central Purchase - Javed Khan (KH0495)
# After Market - Sanjay Yadav (KH0544)
# Central Process - Shalender Yadav (KH0083)

# Admin:
# Kunal Bidla (KH0585)

hod_map = {
    "KH0637": ("HR", "hod"),
    "KH0483": ("Finance & IT", "hod"),
    "006671": ("SCM", "hod"),
    "K01144": ("Central Quality", "hod"),
    "KH0598": ("General Management & Operations", "hod"),
    "KH0641": ("Sales & Applications", "hod"),
    "KH0617": ("R&D", "hod"),
    "KH0495": ("Central Purchase", "hod"),
    "KH0544": ("After Market", "hod"),
    "KH0083": ("Central Process", "hod"),
}

admin_codes = {"KH0585", "KH00585"}

rows = []
for line in csv_data.strip().split("\n"):
    line = line.strip()
    if not line or line.startswith(","):
        continue
    parts = [p.strip() for p in line.split(",")]
    if len(parts) < 6:
        continue
    emp_no, name, email, dept, loc, desig = parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]
    if not emp_no:
        continue
    rows.append({
        "emp_no": emp_no,
        "name": name,
        "email": email,
        "dept": dept,
        "loc": loc,
        "desig": desig
    })

print(f"Total employees parsed: {len(rows)}")

sql_lines = [
    "-- ============================================================",
    "--  FINAL DATABASE SEED SCRIPT (final_script.sql)",
    "--  Inserts all Employee Master Records and assigns initial HODs & Admin",
    "-- ============================================================",
    "USE [Rewards];",
    "GO",
    "",
    "PRINT 'Starting employee master seed...';",
    "",
    "-- 1. Clear existing Employee tables with proper FK integrity",
    "ALTER TABLE dbo.EmpRoles DROP CONSTRAINT IF EXISTS FK_EmpRoles_Employees;",
    "ALTER TABLE dbo.EmpPasswords DROP CONSTRAINT IF EXISTS FK_EmpPasswords_Employees;",
    "",
    "DELETE FROM dbo.EmpPasswords;",
    "DELETE FROM dbo.EmpRoles;",
    "DELETE FROM dbo.Employees;",
    "",
    "-- Re-apply CASCADE foreign keys",
    "ALTER TABLE dbo.EmpRoles ADD CONSTRAINT FK_EmpRoles_Employees",
    "    FOREIGN KEY (Emp_No) REFERENCES dbo.Employees(Emp_No)",
    "    ON DELETE CASCADE ON UPDATE CASCADE;",
    "",
    "ALTER TABLE dbo.EmpPasswords ADD CONSTRAINT FK_EmpPasswords_Employees",
    "    FOREIGN KEY (Emp_No) REFERENCES dbo.Employees(Emp_No)",
    "    ON DELETE CASCADE ON UPDATE CASCADE;",
    "GO",
    "",
    "-- 2. Insert into dbo.Employees",
    "INSERT INTO dbo.Employees (Emp_No, DisplayName, Work_Email, Department, Location, Designation)",
    "VALUES"
]

def sql_esc(s):
    if s is None or s == "":
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

emp_values = []
for r in rows:
    # If the user is an HOD, align their master department with the exact HOD Unit name
    dept_val = r["dept"]
    if r["emp_no"] in hod_map:
        dept_val = hod_map[r["emp_no"]][0]
    val = f"    ({sql_esc(r['emp_no'])}, {sql_esc(r['name'])}, {sql_esc(r['email'])}, {sql_esc(dept_val)}, {sql_esc(r['loc'])}, {sql_esc(r['desig'])})"
    emp_values.append(val)

sql_lines.append(",\n".join(emp_values) + ";")
sql_lines.append("GO")
sql_lines.append("")
sql_lines.append("-- 3. Insert into dbo.EmpRoles")
sql_lines.append("INSERT INTO dbo.EmpRoles (Emp_No, Role, IsHOD, IsPanelJudge, IsAdmin, Gender, UpdatedAt)")
sql_lines.append("VALUES")

role_values = []
for r in rows:
    emp_no = r["emp_no"]
    is_admin = 1 if (emp_no in admin_codes or emp_no == "KH0585") else 0
    is_hod = 1 if emp_no in hod_map else 0
    
    if is_admin:
        role = "admin"
    elif is_hod:
        role = "hod"
    else:
        role = "employee"
        
    val = f"    ({sql_esc(emp_no)}, {sql_esc(role)}, {is_hod}, 0, {is_admin}, NULL, GETDATE())"
    role_values.append(val)

sql_lines.append(",\n".join(role_values) + ";")
sql_lines.append("GO")
sql_lines.append("")
sql_lines.append("PRINT '=== Successfully seeded all employees, HODs, and Admin into dbo.Employees & dbo.EmpRoles ===';")
sql_lines.append("GO")

output_content = "\n".join(sql_lines)

with open(r"d:\ADIT\PROJECT AWARD\my-app\scripts\final_script.sql", "w", encoding="utf-8") as f:
    f.write(output_content)

print("final_script.sql created successfully!")
