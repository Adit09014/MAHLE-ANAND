import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/rewards_db";

async function checkDb() {
  console.log(`Connecting to MongoDB at: ${uri}...\n`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    const collections = await db.listCollections().toArray();
    console.log("=== COLLECTIONS IN DB ===");
    console.log(collections.map((c) => c.name).join(", ") || "No collections found yet.");
    console.log("");

    for (const col of collections) {
      const docs = await db.collection(col.name).find({}).toArray();
      console.log(`--- Collection: ${col.name} (${docs.length} documents) ---`);
      console.log(JSON.stringify(docs, null, 2));
      console.log("");
    }
  } catch (err) {
    console.error("MongoDB Connection / Inspection Error:", err.message);
  } finally {
    await client.close();
  }
}

checkDb();
