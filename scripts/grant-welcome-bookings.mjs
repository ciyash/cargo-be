import 'dotenv/config';
import mongoose from 'mongoose';
import { grantExistingCompanies } from "../src/services/welcome-bookings.js";
try{
  await mongoose.connect(process.env.MONGO_URI,{autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:10000});
  console.log(JSON.stringify(await grantExistingCompanies()));
}catch(error){console.error('Welcome booking grant failed: '+(error.codeName||error.name));process.exitCode=1;}finally{await mongoose.disconnect();}
