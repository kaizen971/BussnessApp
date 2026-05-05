const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://easDatabase:oDqCMD5pRdMBLImo@eas.sg9meiv.mongodb.net/';

async function check() {
  await mongoose.connect(MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections :', collections.map(c => c.name));

  // Cherche les users avec role admin
  const db = mongoose.connection.db;
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`  ${col.name}: ${count} documents`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
