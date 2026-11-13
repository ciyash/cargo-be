from pathlib import Path
from html import escape

root=Path(__file__).resolve().parent
pages=[]
def tree(text):return '<pre class="tree">'+escape(text.strip('\n'))+'</pre>'
def note(title,text):return f'<div class="note"><strong>{title}</strong><p>{text}</p></div>'
def table(headers,rows):return '<table><tr>'+''.join('<th>'+x+'</th>' for x in headers)+'</tr>'+''.join('<tr>'+''.join('<td>'+x+'</td>' for x in row)+'</tr>' for row in rows)+'</table>'
def page(label,title,subtitle,body):
    n=len(pages)+1
    pages.append(f'<section class="page"><header><b>LOGISTICS WORKSPACE</b><span>FLOW BLUEPRINT / 11 NOV 2026</span></header><div class="label">{label}</div><h1>{title}</h1><p class="subtitle">{subtitle}</p><div class="body">{body}</div><footer><span>Company & franchise blueprint · Version 2.0 · Discussion draft</span><b>{n:02d} / 05</b></footer></section>')

page('01 / COMPLETE STRUCTURE','Company → Branch → Franchise','A staff-operated logistics platform. Example company: Chandhu Logistics.',tree('''
COMPANY REGISTRATION
  └─ Company login
      ├─ Purchase booking subscription
      │   └─ Example: INR 5,000 → 10,000 company bookings
      │
      └─ CHANDHU LOGISTICS COMPANY PORTAL
          ├─ Company setup
          │   └─ Domestic / International / Both
          ├─ Company super admin & team
          ├─ Own branches
          │   └─ Branch admin / operational staff
          ├─ Franchise branches
          │   ├─ Created by company / company super admin
          │   ├─ Access given to franchise staff
          │   └─ Company records amount & booking allowance
          ├─ External services
          │   └─ Purchase / enable → Connect → Branch access
          ├─ Staff bookings
          │   ├─ Own coverage → Own logistics
          │   └─ No own coverage → Connected courier service
          ├─ Shipment operations & tracking
          ├─ Company / franchise booking-count ledger
          └─ Reports under Chandhu Logistics
''')+note('Branding & responsibility','Franchises operate under the parent logistics company’s name. Branches, bookings, staff and reports belong to that company. The customer provides shipment information; company/branch staff uses the portal.')+note('Where Ciyash appears','Ciyash is the platform provider for company subscription / booking packs and external-service enablement fees. It does not appear as an operational branch or as the company super admin. The super admin discussed here belongs to Chandhu Logistics.')+note('Document scope','This is the latest proposed flow incorporating company subscriptions and franchises. It supersedes the earlier unlimited-booking demo assumptions for planning purposes. The current dummy site does not yet implement this full franchise/quota model.'))

page('02 / COMPANY SETUP','Set up the company’s network','Only company login or the company super admin creates branches, including franchise branches.',tree('''
COMPANY LOGIN / COMPANY SUPER ADMIN
  ├─ Select operating categories
  │   ├─ Domestic
  │   ├─ International
  │   └─ Both
  │       └─ Same company offering applies to all branches
  │
  ├─ Create branch
  │   ├─ Own branch → Details → Admin / staff access
  │   └─ Franchise branch
  │       ├─ Details → Admin / staff access
  │       ├─ Enter commercial amount / reference
  │       └─ Enter allowed number of bookings
  │
  └─ External services
      ├─ View available service list (e.g. DTDC integration)
      ├─ View separate Ciyash enablement fee
      ├─ Purchase / enable the selected service
      ├─ Connect the required service account
      └─ Enabled services available to company branches
          └─ Includes franchise branches
''')+table(['Rule','Expected behaviour'],[
['Inherited services','A franchise only gets the categories and enabled services offered by its parent company.'],
['No third-party entitlement','If the company has no enabled external service, its franchises cannot use that external service. Show the company admin an enablement action; do not silently allow booking.'],
['Franchise payment','Company decides the amount charged and booking allowance. Record the entry; do not require the platform to process the company–franchise cash/phone/offline payment.'],
['Different fees','Ciyash service enablement fee is separate from the customer’s parcel freight and any courier shipment cost.'],
])+note('Access hierarchy','Company / company super admin → Branch admin / staff. Branch creation remains with the company or company super admin; this flow does not give franchise staff independent branch creation.'))

page('03 / BOOKING DECISION','Address first. Own network first.','Domestic / International describes the route. Own / External describes who handles the shipment.',tree('''
STAFF LOGIN → NEW BOOKING
  ├─ Customer supplies address & parcel information
  ├─ Select Domestic / International (company-enabled only)
  ├─ Enter sender, receiver, pickup & destination addresses
  ├─ Enter contents, packages, weight, dimensions & value
  │
  ├─ CHECK COMPANY NETWORK COVERAGE
  │   ├─ Route served by the company’s branch network
  │   │   └─ Own logistics → Branch route → Freight charges
  │   └─ Route not served
  │       ├─ Show enabled / connected external services
  │       ├─ Show available services & shipping charges
  │       ├─ Staff selects service
  │       └─ Selected courier form → Required details
  │           └─ Validate service / quote before confirmation
  │
  ├─ International shipment
  │   └─ Declaration + invoice + required documents
  │       + goods value / currency + duties responsibility
  │
  └─ REVIEW → CHECK QUOTAS → CONFIRM BOOKING
      ├─ Success → Save CRM record → Consume booking count
      │   ├─ Own: Shipment ID / GRN / LR / Receipt
      │   └─ External: Shipment ID / AWB / Provider documents
      ├─ Failure → Do not consume count / release reservation
      └─ Pending → Reconcile status; avoid duplicate booking
''')+note('Four supported combinations','Domestic + own logistics; Domestic + external courier; International + own overseas network; International + external courier. Own coverage must be based on the actual company service area, not only a similar branch name or city.')+note('User-friendly service screen','Keep the CRM consistent. Use common sender/receiver/parcel fields, show connected provider options clearly, then show the selected provider’s additional fields. Whether exact rates can appear before its form depends on the data required by that provider; rate-check timing is an implementation detail to confirm.')+note('Records remain in the company CRM','Store the company, branch/franchise, category, fulfilment, selected service, provider reference, charges, identifiers and shipment events. This allows company-wide and franchise-wise reports.'))

page('04 / BOOKING QUOTAS','One company quota. Branch allowances.','Franchise allocations do not consume the purchased company quota. Actual bookings do.',tree('''
CHANDHU LOGISTICS: PURCHASED COMPANY QUOTA = 10,000
  ├─ Own branches use the company quota
  ├─ Franchise A: allowance assigned by Chandhu Logistics
  └─ Franchise B: allowance assigned by Chandhu Logistics

FOR EACH BOOKING
  ├─ Company remaining quota must be available
  ├─ Franchise remaining allowance must also be available
  │   └─ For a franchise booking
  └─ Confirmed successful booking
      ├─ Company remaining: -1
      └─ Applicable franchise remaining: -1

FAILURE / ELIGIBLE CANCELLATION
  ├─ Failed: do not consume, or release reserved count
  ├─ Successfully cancelled before loading
  │   ├─ Company remaining: +1
  │   └─ Applicable franchise remaining: +1
  └─ Loaded shipment: cancellation not allowed
''')+table(['Example event','Company remaining','Franchise A remaining'],[
['Starting balance','10,000','1,000'],['Franchise A booking succeeds','9,999','999'],['That booking is cancelled before loading','10,000','1,000'],
])+note('Proposed exhaustion solution','Franchise allowance exhausted → only that franchise’s new bookings stop; company admin can top up its allowance. Company quota exhausted → all branches’ new bookings stop until additional quota is purchased. Existing booked shipments continue through tracking, operations and delivery.')+note('Allocation can exceed company quota','The company may assign franchise allowances as it chooses, even if their total is larger than the company quota. All branches together still cannot consume more actual bookings than the purchased company balance.')+note('Count accuracy','Use one auditable booking-count record per consume/restore action. Concurrent bookings must not exceed available quota. Retries or repeated cancellation requests must not restore a count twice.'))

page('05 / OPERATIONS & REPORTS','After booking: move, track, deliver.','Company staff manages the shipment; all activity stays under the parent company.',tree('''
SHIPMENT EXECUTION
  ├─ Own logistics
  │   └─ Booked → Loaded → Dispatch / In transit
  │       → Unloaded → Receiver & collection → Delivered
  └─ External courier
      └─ Booked → Pickup → In transit
          → Out for delivery → Delivered
          └─ Provider events displayed in the company CRM

COMPANY REPORTS
  ├─ Company-wide bookings & shipment summary
  ├─ Own branch / franchise-wise bookings
  ├─ Company quota: purchased / consumed / restored / remaining
  ├─ Franchise allowance: allotted / used / restored / remaining
  ├─ Domestic / International & Own / External split
  ├─ Dispatch / receipt / pending stock / delivered shipments
  ├─ External courier bookings & tracking
  ├─ Collections / credit outstanding / courier settlements
  └─ Cancellation / refunds / exceptions / performance
''')+table(['Money / count','Keep separately recorded'],[
['Company subscription','Ciyash booking pack fee and purchased company quota.'],['External enablement','Separate Ciyash fee for enabled external services.'],['Franchise allocation','Company-entered commercial amount and booking allowance.'],['Parcel finances','Customer freight, collections, courier cost, settlement and refunds.'],
])+note('Still to confirm before implementation','1. Booking pack expiry / validity and treatment of unused balances.<br>2. External-service fee: one-time, monthly or another period.<br>3. External cancellation cutoff: proposed rule is before pickup/handover, only after provider cancellation confirmation. Do not restore count while confirmation is pending.<br>4. Whether own and external bookings always carry identical quota weight; current blueprint assumes one count per successful booking.')+note('Next implementation step','Approve these business rules, then update tenant/company permissions, subscription quota ledger, franchise allocation, service entitlements, booking/cancellation logic and reports. Actual carrier integration requirements are validated separately.'))

css='''@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#e9eee8;font-family:"Segoe UI",Arial,sans-serif;color:#1c3d3a;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:210mm;height:297mm;margin:0 auto 7mm;background:#fff;padding:13mm 15mm 15mm;position:relative;break-after:page;overflow:hidden}.page:last-child{break-after:auto}header{display:flex;align-items:center;justify-content:space-between;padding-bottom:3mm;margin-bottom:6mm;border-bottom:1px solid #d9e4d5}header b{font-size:9pt;color:#315e50;letter-spacing:.6px}header span{font-size:6.5pt;color:#7b8975;letter-spacing:.7px}.label{font-size:7.5pt;font-weight:bold;color:#7b965e;letter-spacing:1px}h1{font-size:26pt;line-height:1.15;letter-spacing:-.8px;margin:2mm 0 3mm}.subtitle{font-size:10pt;line-height:1.45;color:#6f7f6b;margin:0 0 5mm}.tree{font-family:Consolas,"Courier New",monospace;font-size:9pt;line-height:1.45;white-space:pre-wrap;border:1px solid #dce5d5;background:#f5f8f0;border-radius:2mm;padding:4mm;margin:0 0 4mm;color:#234737}.note{margin:3mm 0;border-left:3px solid #96ad7e;padding:2.5mm 3mm;background:#f3f6ee;font-size:9pt;line-height:1.43}.note strong{display:block;font-size:9pt;margin-bottom:1mm;color:#3c6449}.note p{margin:0}table{border-collapse:collapse;width:100%;font-size:8.5pt;margin:3mm 0;table-layout:fixed}th{text-align:left;background:#e9f0e2;padding:2mm;color:#486743;font-size:8pt}td{padding:2mm;border-bottom:1px solid #e0e8d9;vertical-align:top;line-height:1.38}th:first-child{width:30%}footer{position:absolute;left:15mm;right:15mm;bottom:7mm;border-top:1px solid #dce6d4;padding-top:2.5mm;font-size:6.7pt;color:#829077;display:flex;justify-content:space-between}@media print{body{background:#fff}.page{margin:0}}'''
assert len(pages)==5
out=root/'Company-Franchise-Blueprint.html'
out.write_text('<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Company and Franchise Logistics Blueprint</title><style>'+css+'</style></head><body>'+''.join(pages)+'</body></html>',encoding='utf-8')
source=(root/'render-reports-pdf.mjs').read_text(encoding='utf-8')
source=source.replace('9228','9230').replace('CargoNest-Reports-Visual-Blueprint.html','Company-Franchise-Blueprint.html').replace('!==7','!==5').replace('CargoNest-Reports-Preview.png','Company-Franchise-Preview.png').replace("new URL('./CargoNest-Reports-Visual-Blueprint.pdf',import.meta.url)","new URL('../PDFs-To-Share/Company-Franchise-Blueprint.pdf',import.meta.url)")
(root/'render-company-franchise-pdf.mjs').write_text(source,encoding='utf-8')
(root.parent/'PDFs-To-Share').mkdir(exist_ok=True)
print(out)
