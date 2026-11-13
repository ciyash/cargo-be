import mongoose from "mongoose";
import { legacyDataScopePlugin } from '../services/legacy-data-scope.js';

const branchDailySnapshotSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  branchCode: { type: String, required: true },
  date: { type: Date, required: true },
  openingBalance: { type: Number, required: true },
  income: { type: Number, required: true },
  expenses: { type: Number, required: true },
  closingBalance: { type: Number, required: true },
});


const ExpenseSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  branchId: { type:String ,required: true },
  expenseDate: { type: Date, default: () => new Date() },
  expenseType: { type: String, required: true },
  amount: { type: Number, required: true, min:0, max:100000000 },
  paidThrough: { type: String, required: true },
  invoice: { type: String, required: true },
  notes: { type: String, required: true },

}, {
  timestamps: true,
});

const ExpenseTypeSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  accountType: { type: String, required: true },
  accountName: { type: String, required: true },
  accountCode: { type: String },
  description: { type: String },
  isActive: { type: Boolean, default: false },
}, {
  timestamps: true,
});

const CustomerSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true },
  mobile: { type: Number },
}, {
  timestamps: true,
});

const AccountCatSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true }
}, {
  timestamps: true,
});

const AccountSubCatSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'AccountCat', required: true },
  name: { type: String, required: true }
}, {
  timestamps: true,
});

branchDailySnapshotSchema.index({ companyId: 1, branchCode: 1, date: 1 });
ExpenseSchema.index({ companyId: 1, branchId: 1, expenseDate: -1 });

export const AccountCat = mongoose.model('AccountCat', AccountCatSchema);
export const AccountSubCat = mongoose.model('AccountSubCat', AccountSubCatSchema);
ExpenseSchema.plugin(legacyDataScopePlugin,{kind:'expense'});
export const Expense = mongoose.model("Expense", ExpenseSchema);
export const ExpenseType = mongoose.model("ExpenseType", ExpenseTypeSchema);
export const Customer = mongoose.model("Customer", CustomerSchema);
export const BranchDailySnapshot = mongoose.model("BranchDailySnapshot", branchDailySnapshotSchema);
