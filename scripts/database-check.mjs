import 'dotenv/config';
import mongoose from 'mongoose';
import "../src/models/bank.model.js";
import "../src/models/item.model.js";
import "../src/models/vendor.model.js";
import "../src/models/expensive.model.js";
import "../src/models/booking.model.js";
import "../src/models/parcel.loading.model.js";
import "../src/models/parcel.unloading.model.js";

// Read-only deployment preflight. Does not migrate records or create indexes.
try {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  const transactions = Boolean(hello.setName || hello.msg === 'isdbgrid');
  console.log(JSON.stringify({ transactionCapableTopology: transactions }));
  if (!transactions) process.exitCode = 1;
  for (const name of ['Bank', 'Item', 'Vendor', 'Expense', 'ExpenseType', 'Customer', 'AccountCat', 'AccountSubCat', 'BranchDailySnapshot']) {
    const missingCompany = await mongoose.model(name).countDocuments({ $or: [{ companyId: { $exists: false } }, { companyId: null }] });
    console.log(JSON.stringify({ model: name, recordsNeedingCompanyBackfill: missingCompany }));
    if (missingCompany) process.exitCode = 1;
  }
  for (const name of ['Booking', 'ParcelLoading', 'ParcelUnloading']) {
    const indexes = await mongoose.model(name).collection.indexes().catch(error => {
      if (error.code === 26) return [];
      throw error;
    });
    console.log(JSON.stringify({ model: name, existingIndexes: indexes.map(index => index.key), declaredIndexes: mongoose.model(name).schema.indexes().map(([key]) => key) }));
  }
} catch (error) {
  console.error('Database preflight failed:', error.name === 'MongooseServerSelectionError' ? 'Database unavailable' : error.name);
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
