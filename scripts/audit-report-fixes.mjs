import fs from 'node:fs';
const file = 'controllers/booking.controller.js';
let source = fs.readFileSync(file, 'utf8');
source = "import { reportDayStart, reportDayEnd } from '../utils/report-input.js';\n" + source;
let reports = false;
const normalized = new Set();
source = source.split('\n').flatMap(line => {
  if (line.startsWith('const parcelBookingReports =')) reports = true;
  if (!reports || /^\s*\/\//.test(line)) return [line];
  if (/^const \w+ = async/.test(line)) normalized.clear();
  line = line.replace(/new Date\((fromDate|startDate)\s*\+\s*"T00:00:00(?:\.000Z|\+05:30)"\)/g, 'reportDayStart($1)')
    .replace(/new Date\((toDate|endDate)\s*\+\s*"T23:59:59(?:\.999Z|\+05:30)"\)/g, 'reportDayEnd($1)')
    .replace(/new Date\(`\$\{(fromDate|startDate)\}T00:00:00\.000Z`\)/g, 'reportDayStart($1)')
    .replace(/new Date\(`\$\{(toDate|endDate)\}T23:59:59\.999Z`\)/g, 'reportDayEnd($1)')
    .replace(/new Date\((fromDate|startDate)\)/g, 'reportDayStart($1)')
    .replace(/new Date\((toDate|endDate)\)/g, 'reportDayEnd($1)')
    .replace(/new Date\(`\$\{year\}-\$\{month\}-\$\{day\}T00:00:00\.000Z`\)/g, 'reportDayStart(`${year}-${month}-${day}`)')
    .replace(/new Date\(`\$\{year\}-\$\{month\}-\$\{day\}T23:59:59\.999Z`\)/g, 'reportDayEnd(`${year}-${month}-${day}`)');
  const init = line.match(/(?:const|let) (\w+) = (reportDay(?:Start|End)|new Date)/);
  if (init) { if (init[2].startsWith('reportDay')) normalized.add(init[1]); else normalized.delete(init[1]); }
  const setter = line.match(/^\s*(\w+)\.setHours\(/);
  if (setter && normalized.has(setter[1])) return [];
  line = line.replace('if (bookedBy) filter.bookedBy = bookedBy;', 'if (bookedBy) filter.bookedBy = new mongoose.Types.ObjectId(bookedBy);');
  return [line];
}).join('\n');
// A MongoDB aggregation does not cast company ID strings like find() does.
const gstStart = source.indexOf('const parcelBranchWiseGSTReport =');
const gstEnd = source.indexOf('const consolidatedReportBranch =', gstStart);
source = source.slice(0,gstStart) + source.slice(gstStart,gstEnd)
  .replace('      companyId,', '      companyId: new mongoose.Types.ObjectId(companyId),')
  .replaceAll('/^pay$/i', '/^paid$/i') + source.slice(gstEnd);
// Join by company as well as branch code to prevent duplicate/cross-company results.
source = source.replace('          foreignField: "branchUniqueId",\n          as: "branchDetails",', '          foreignField: "branchUniqueId",\n          pipeline: [{ $match: { companyId: new mongoose.Types.ObjectId(companyId) } }],\n          as: "branchDetails",');
source = source.replace('const startDate = moment(selectedDate, "DD-MM-YYYY")\n      .startOf("day")\n      .toDate();\n    const endDate = moment(selectedDate, "DD-MM-YYYY").endOf("day").toDate();', 'const startDate = reportDayStart(selectedDate);\n    const endDate = reportDayEnd(selectedDate);');
fs.writeFileSync(file, source);
