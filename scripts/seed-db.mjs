import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/rewards_db";

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

const sampleEmployees = [
  { code: "M1001", name: "Rajesh Kumar", unitId: "khandsa", gender: "Male", designation: "Production Manager", role: "hod", isPanelJudge: true, email: "m1001@mahle.com" },
  { code: "M1002", name: "Priya Sharma", unitId: "hr", gender: "Female", designation: "HR Lead", role: "hr", isPanelJudge: false, email: "m1002@mahle.com" },
  { code: "M1003", name: "Vikram Singh", unitId: "pune", gender: "Male", designation: "Plant Engineer", role: "employee", isPanelJudge: false, email: "m1003@mahle.com" },
  { code: "M1004", name: "Ananya Roy", unitId: "rnd", gender: "Female", designation: "Senior R&D Scientist", role: "employee", isPanelJudge: false, email: "m1004@mahle.com" },
  { code: "M1005", name: "Suresh Nair", unitId: "ops", gender: "Male", designation: "Operations Lead", role: "hod", isPanelJudge: true, email: "m1005@mahle.com" },
  { code: "M1006", name: "Neha Gupta", unitId: "cq", gender: "Female", designation: "Quality Assurance Specialist", role: "employee", isPanelJudge: false, email: "m1006@mahle.com" },
  { code: "M1007", name: "Deepak Verma", unitId: "cpur", gender: "Male", designation: "Purchase Executive", role: "employee", isPanelJudge: false, email: "m1007@mahle.com" },
  { code: "M1008", name: "Kavita Patel", unitId: "fin", gender: "Female", designation: "Finance Analyst", role: "employee", isPanelJudge: false, email: "m1008@mahle.com" },
];

const initialCycle = {
  month: currentMonth,
  stage: "nomination",
  judges: [
    { id: "j1", name: "Rajesh Kumar (Khandsa)", code: "M1001" },
    { id: "j2", name: "Suresh Nair (Operation)", code: "M1005" },
    { id: "j3", name: "Unassigned Panel Slot", code: "" },
  ],
  nominations: [],
  endorsed: {},
  scores: {},
  announcedAt: null,
  createdAt: new Date(),
};

async function seed() {
  console.log(`Connecting to MongoDB at: ${uri}...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    // Seed Employees master collection
    for (const emp of sampleEmployees) {
      await db.collection("employees").updateOne(
        { code: emp.code },
        { $set: { ...emp, updatedAt: new Date() } },
        { upsert: true }
      );
    }
    console.log(`✓ Seeded ${sampleEmployees.length} employee records into 'employees' collection`);

    // Seed cycle
    await db.collection("cycles").updateOne(
      { month: currentMonth },
      { $setOnInsert: initialCycle },
      { upsert: true }
    );
    console.log(`✓ Initial cycle verified in collection 'cycles' for month: ${currentMonth}`);

    // Seed branding
    await db.collection("branding").updateOne(
      { key: "header_logo" },
      { $setOnInsert: { key: "header_logo", logoUrl: "", createdAt: new Date() } },
      { upsert: true }
    );
    console.log(`✓ Initial branding record verified in collection 'branding'`);

    // Seed points
    await db.collection("points").updateOne(
      { key: "annual_ledger" },
      { $setOnInsert: { key: "annual_ledger", points: {}, createdAt: new Date() } },
      { upsert: true }
    );
    console.log(`✓ Initial points record verified in collection 'points'`);

    console.log("\nDatabase 'rewards_db' successfully updated with employee master data!");
  } catch (err) {
    console.error("Error seeding MongoDB:", err.message);
  } finally {
    await client.close();
  }
}

seed();
