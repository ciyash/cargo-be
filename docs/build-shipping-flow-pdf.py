"""Generate a print-ready, self-contained flow document using only Python stdlib."""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent
pages = []

def p(text): return f'<p>{text}</p>'
def heading(text): return f'<h2>{text}</h2>'
def bullets(items): return '<ul>' + ''.join(f'<li>{x}</li>' for x in items) + '</ul>'
def numbered(items): return '<ol>' + ''.join(f'<li>{x}</li>' for x in items) + '</ol>'
def table(headers, rows):
    return '<table><thead><tr>' + ''.join(f'<th>{x}</th>' for x in headers) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join(f'<td>{x}</td>' for x in row) + '</tr>' for row in rows) + '</tbody></table>'
def note(title, text, tone=''): return f'<aside class="note {tone}"><strong>{title}</strong><div>{text}</div></aside>'
def flow(items): return '<div class="flow">' + '<span class="flow-arrow">↓</span>'.join(f'<div class="flow-node">{x}</div>' for x in items) + '</div>'
def page(kicker, title, lead, body):
    pages.append(f'<article class="page"><header><span>CARGONEST / PRODUCT BLUEPRINT</span><span>05 NOV 2026 · v1.0</span></header><div class="kicker">{kicker}</div><h1>{title}</h1><p class="lead">{lead}</p>{body}<footer><span>Staff shipping workflow · Proposed product flow &amp; working demo</span><span>{len(pages)+1:02d} / 14</span></footer></article>')

pages.append('''<article class="page cover"><div class="cover-top"><div class="logo">CN</div><strong>CargoNest<span>.</span></strong><span class="version">FLOW BLUEPRINT / 01</span></div><div class="cover-kicker">THE COMPANY STAFF WORKSPACE</div><h1>One address.<br>The right route.</h1><p class="cover-sub">Domestic &amp; international shipping<br>Own logistics &amp; external courier services</p><div class="cover-rule"></div><p class="cover-description">A complete, page-by-page document showing how company staff checks branch coverage, chooses a service, books a parcel and manages its journey through delivery.</p><div class="cover-tags"><span>DOMESTIC</span><span>INTERNATIONAL</span><span>OWN NETWORK FIRST</span></div><div class="cover-bottom"><div><small>PREPARED FOR</small><p>CargoNest product &amp; development planning</p></div><div><small>DOCUMENT DATE</small><p>05 November 2026 · Version 1.0</p></div></div><div class="cover-note"><b>The customer provides shipment information. Company staff operates the platform.</b><br>This document describes the agreed direction, the clickable dummy prototype and the production work still needed.</div><footer><span>CargoNest · Staff shipping workflow</span><span>01 / 14</span></footer></article>''')

page('01 / PURPOSE & RESPONSIBILITIES', 'What this system does', 'A staff-operated logistics workspace. The customer supplies the address and parcel details; the company manages the booking.',
    heading('The central business rule') + note('Use the company’s own network first.', 'Staff enters the pickup and delivery addresses. The system checks own-company branch coverage. If the route is covered, staff books through own logistics. If it is not covered, staff compares available external courier services and books the selected service.') +
    heading('Two separate choices — keep them clear') + table(['Choice', 'Options', 'Meaning'], [
        ['Shipment category', '<b>Domestic / International</b>', 'Where the parcel travels: within India or across a national border.'],
        ['Fulfilment method', '<b>Own logistics / External courier</b>', 'Who transports the parcel: the company’s own branch network or a courier partner.'],
    ]) + p('Domestic does not automatically mean own logistics. International does not automatically mean an external courier. Both categories can use either method, depending on the company’s coverage.') +
    heading('Who is responsible?') + table(['Person / system', 'Responsibility'], [
        ['Customer', 'Provides sender/receiver information, destination address and parcel details. No customer portal is included in this blueprint.'],
        ['Company operations staff', 'Creates the shipment, checks coverage, selects a service, records freight collection and manages the shipment.'],
        ['Origin / destination branch staff', 'Handles own-network loading, dispatch, unloading and delivery confirmations.'],
        ['Company owner / admin', 'Sets up branches, staff permissions, courier connections and business settings.'],
        ['Courier integration', 'In the production design: returns serviceability/rates, confirms bookings and provides tracking and documents.'],
    ]) + note('Company context applies throughout', 'Branches, staff, shipments, quotes, financial records and reports must belong to the signed-in company. Role and branch permissions must be enforced by the backend in production.', 'warm') +
    heading('How to read this document') + p('Pages 3–5 explain navigation and the coverage decision. Pages 6–9 describe all four shipping journeys. Pages 10–12 cover confirmation, delivery and exceptions. Pages 13–14 cover supporting screens, sample walkthroughs and implementation boundaries.'))

page('02 / MASTER JOURNEY', 'The complete decision flow', 'One entry point, two shipment categories and a coverage-based fulfilment decision.',
    flow(['Staff login → Operations dashboard', 'Click <b>New shipment</b>', 'Select <b>Domestic</b> or <b>International</b>', 'Enter pickup address + delivery address + parcel details', 'Click <b>Check branch coverage</b>']) +
    '<div class="split"><div class="lane"><h3>Own coverage available</h3><p>Both ends of the route are served.</p><div class="mini-node">Select own logistics service<br>Confirm origin &amp; destination branches</div></div><div class="lane warm"><h3>Own coverage unavailable</h3><p>The company cannot serve the complete route.</p><div class="mini-node">Compare external courier quotes<br>Select available partner service</div></div></div>' +
    flow(['<b>International only:</b> Customs declaration + required documents', 'Review shipment + charges + freight collection instructions', 'Confirm booking → Receive shipment identifiers and documents']) +
    '<div class="split"><div class="lane"><h3>Own logistics execution</h3><p>Booked → Loaded → In transit → Unloaded → Delivered</p></div><div class="lane warm"><h3>External courier execution</h3><p>Booked → Pickup scheduled → Picked up → In transit → Out for delivery → Delivered</p></div></div>' +
    note('The staff remains the operator', 'The customer does not choose courier services on a customer website in this flow. Company staff checks and selects the service on the customer’s behalf.'))

page('03 / PAGE NAVIGATION', 'What opens after each click', 'These are the main pages in the clickable staff prototype.',
    table(['Menu / button', 'Page opened', 'Next action'], [
        ['Staff sign-in', 'Operations dashboard', 'View summary or click New shipment.'],
        ['New shipment', 'Shipment category page', 'Select Domestic / International, or open a sample journey.'],
        ['Domestic / International', 'Addresses & parcel details', 'Fill the shipment information and check coverage.'],
        ['Check branch coverage', 'Coverage result', 'Review origin/destination coverage and the selected fulfilment path.'],
        ['View own service / Compare couriers', 'Service selection', 'Select an own route or a serviceable courier quote.'],
        ['Continue — domestic', 'Review & confirm', 'Check charges and record freight collection instructions.'],
        ['Continue — international', 'Customs & documents', 'Complete the declaration and required documents, then review.'],
        ['Confirm demo booking', 'Booking success', 'View shipment, download a demo document or create another booking.'],
        ['All shipments → click a row', 'Shipment details', 'View addresses, service, charges, timeline and available actions.'],
        ['Own logistics', 'Loading / Dispatch / Unloading / Delivery queues', 'Select an eligible own-network shipment and record the next operation.'],
        ['Tracking', 'Shipment lookup', 'Search by shipment ID, GRN, LR or AWB; open shipment details.'],
        ['Branch network', 'Own branch directory', 'Review example branches and coverage.'],
        ['Courier partners', 'Partner directory', 'Review simulated service capabilities and try a partner journey.'],
        ['Reports', 'Operations summary & shipment register', 'Review category/fulfilment totals and export CSV.'],
        ['Explore the demo', 'Flow map & sample journeys', 'Try any of the four journeys or reset demo data.'],
    ]) +
    note('Back and edit behaviour', 'Staff can return to earlier screens. Changing addresses or parcel details invalidates the previous coverage result and selected quote. Recheck coverage and select the service again before confirming.') +
    heading('Information visible across the booking pages') + p('A shipment summary shows category, pickup and destination, parcel contents, package count and weight. After service selection it also shows the provider, freight, surcharges, demo tax and total shipping quote.'))

page('04 / COMMON BOOKING STEPS', 'Capture the shipment. Check coverage.', 'The initial pages are shared by domestic and international shipments.',
    heading('Step 1 · Choose the shipment category') + p('<b>Domestic:</b> pickup and delivery within India. <b>International:</b> pickup in India and delivery in another country in this prototype. The current prototype does not model inbound imports or foreign-to-foreign shipments.') +
    heading('Step 2 · Enter addresses and parcel information') + table(['Section', 'Information captured'], [
        ['Pickup', 'Sender name, contact number, country, city, PIN code and full street / building / area address.'],
        ['Delivery', 'Receiver name, contact number, destination country, city, PIN / postal code, full address and email. Email is required for international bookings in the demo.'],
        ['Parcel', 'Contents description, package quantity, weight and dimensions per package, total declared goods value, currency and handling notes.'],
    ]) + p('The demo uses identical packages in a booking. Mixed package sizes and multiple parcel rows should be added when the production requirements are defined.') +
    heading('Step 3 · Evaluate own-company coverage') + table(['Pickup covered?', 'Delivery covered?', 'Route result'], [
        ['Yes', 'Yes — different served branch', '<b>Own logistics</b> service.'],
        ['Yes', 'No', '<b>External courier</b> comparison.'],
        ['No', 'Yes or No', '<b>External courier</b> comparison, provided a partner serves both addresses.'],
        ['Same branch at both ends', 'Yes', 'Demo sends this to external comparison. Production local-delivery rules remain to be decided.'],
    ]) +
    note('Coverage must mean service to the address', 'A branch existing in the same city is not sufficient evidence of production serviceability. Actual branch delivery areas, PIN/postal coverage and pickup capability must be defined. The prototype uses country + city + postal prefix as a simplified demonstration.') +
    heading('What the coverage result page shows') + bullets(['Matched origin and destination branches, if found.', 'A clear reason when pickup or delivery is outside the own network.', 'Exactly one primary next path: own service or external courier comparison.', 'An Edit addresses button to correct the shipment before continuing.']))

page('05 / JOURNEY A', 'Domestic → Own logistics', 'Example: Hyderabad → Vijayawada, where both addresses are served by the company’s own branches.',
    numbered([
        '<b>Dashboard → New shipment → Domestic.</b> Staff starts a shipment within India.',
        '<b>Addresses & parcel page.</b> Enter sender, receiver, addresses, package information and declared value.',
        '<b>Check branch coverage.</b> Origin matches Hyderabad Central; destination matches Vijayawada Hub.',
        '<b>Coverage result → View own logistics service.</b> Show the own-company branch route, service description, charges and estimated delivery.',
        '<b>Select own service → Continue to review.</b> No international customs page is shown.',
        '<b>Review & freight collection.</b> Staff checks all details and selects Paid, To Pay, Credit or FOC.',
        '<b>Confirm booking.</b> Create a shipment and show the shipment ID, GRN and LR number; allow receipt download.',
        '<b>Open Own logistics.</b> Origin staff loads the parcel, then records dispatch.',
        '<b>Destination receipt.</b> Receiving staff confirms unloading at the destination branch.',
        '<b>Final delivery.</b> Staff records receiver confirmation and any freight collection, then marks the shipment Delivered.',
    ]) +
    flow(['Booking success / GRN + LR', 'Loading queue → Vehicle & driver details → Confirm loading', 'Dispatch queue → Dispatch reference → Confirm dispatch', 'Unloading queue → Receiving staff details → Confirm unloading', 'Delivery queue → Receiver + collection → Complete delivery']) +
    note('Customer delivery remains part of the journey', 'The own-network shipment is not finished simply because it reaches a branch. Delivery must be confirmed using the company’s agreed branch collection / final-mile delivery arrangement.') +
    note('Optional onward branch transfer — production extension', 'The existing backend has branch-to-branch operations. If intermediate transfers are required in the new design, the onward branch and final destination must be explicit: unload → onward load → next branch receipt → final delivery. This optional multi-leg routing is not a separate interactive journey in the current dummy prototype.', 'warm'))

page('06 / JOURNEY B', 'Domestic → External courier', 'Example: Hyderabad → Jaipur, where the own company network does not cover the destination address.',
    numbered([
        '<b>Dashboard → New shipment → Domestic.</b> Staff enters addresses and parcel information.',
        '<b>Check branch coverage.</b> Show that the destination is outside the own branch service area.',
        '<b>Coverage result → Compare courier services.</b> Use pickup PIN, delivery PIN, package weight/dimensions and required service information.',
        '<b>Compare the returned services.</b> Show service availability, provider, standard/express option, total quote, charge breakdown and delivery estimate.',
        '<b>Sort and select.</b> Staff can choose Lowest price or Fastest delivery. The cheapest service is a suggestion; staff makes the selection.',
        '<b>Continue to review.</b> Check addresses, selected courier, parcel details and customer freight collection.',
        '<b>Confirm booking.</b> In production, send one booking request to the selected courier and wait for confirmation.',
        '<b>Booking success.</b> Show the company shipment ID, courier name, AWB/tracking number, available label and pickup state.',
        '<b>Pickup and tracking.</b> Follow courier updates through final delivery at the receiver address.',
    ]) +
    heading('How the service comparison should read') + table(['Visible information', 'Why staff needs it'], [
        ['Serviceable pickup + delivery', 'Only choose a partner that can handle the complete route.'],
        ['Total quote + charge breakdown', 'Compare the actual payable shipping amount, including disclosed surcharges.'],
        ['Estimated delivery + service type', 'Balance price against speed and handling requirements.'],
        ['Pickup / drop-off availability', 'Understand how the parcel enters the courier network.'],
    ]) +
    note('External means a complete partner-handled shipment', 'This blueprint’s primary external path uses the partner from pickup through delivery. It does not silently combine an own first leg with an external final leg. Hybrid transfers need a separately designed handover flow.') +
    note('Current demo behaviour', 'RoadLink and SwiftParcel are fictional domestic services. Quotes, confirmation, labels and tracking are simulated. The demo does not call a courier API or request a real pickup.', 'warm'))

page('07 / JOURNEY C', 'International → Own logistics', 'Example: Hyderabad → Dubai, using an own overseas branch in the illustrative company network.',
    numbered([
        '<b>Dashboard → New shipment → International.</b> Staff chooses an overseas destination.',
        '<b>Addresses & parcel page.</b> Capture pickup in India, foreign destination country/address, receiver contact/email, contents, dimensions and value/currency.',
        '<b>Check own branch coverage.</b> Confirm the company can serve the origin and the overseas destination address.',
        '<b>View own overseas service.</b> Show origin branch → overseas branch, shipping charges and estimated transit time.',
        '<b>Select service → Customs & documents.</b> International paperwork is required in the workflow even when both branches belong to the company.',
        '<b>Complete the declaration.</b> Enter shipment purpose, item description, HS code, invoice reference, declared value and duties responsibility.',
        '<b>Add supporting documents.</b> Attach the required invoice and sender KYC / identity documents in the demo. Actual requirements must be configurable by route and service.',
        '<b>Review & confirm.</b> Verify the route, recipient address, customs details, documents, charges and collection instructions.',
        '<b>Booking success.</b> Show shipment ID and own-network references. Continue to the company’s operational shipment journey.',
        '<b>Dispatch → Overseas receipt → Delivery.</b> Track the international movement, receive at the destination branch and confirm final delivery.',
    ]) +
    heading('International information in the booking record') + table(['Data group', 'Saved information'], [
        ['Destination', 'Country, full address, postal code if applicable, receiver phone and email.'],
        ['Goods declaration', 'Contents, purpose, item classification reference, invoice, value and currency.'],
        ['Documents', 'Required document references and validation state.'],
        ['Charges & duties', 'Shipping quote separately from any customs duties / destination taxes; responsible party recorded.'],
    ]) +
    note('Own overseas does not remove international processing', 'The production design needs the company’s actual export handling, clearance and destination delivery process. Any international partner handovers and clearance milestones must be added explicitly; the dummy screens do not prove operational or regulatory readiness.', 'warm') +
    note('Demo address detail', 'Dubai Overseas is a fictional own branch. The postal code 00000 is only a demo placeholder, not a production postal-address rule.'))

page('08 / JOURNEY D', 'International → External courier', 'Example: Hyderabad → London, where the company has no own branch coverage for the destination address.',
    numbered([
        '<b>New shipment → International.</b> Staff enters pickup and overseas delivery details, parcel contents, weight/dimensions and value.',
        '<b>Check branch coverage.</b> Show the unavailable own route and explain the destination coverage gap.',
        '<b>Compare international services.</b> Request serviceability and rates for the destination country/postal area and the full parcel details.',
        '<b>Select the service.</b> Compare economy/express, total shipping quote, estimated transit time and disclosed exclusions.',
        '<b>Customs & documents.</b> Complete the declaration and required paperwork before booking confirmation.',
        '<b>Review charges and duties responsibility.</b> Make clear which amounts are included, excluded, estimated or payable later.',
        '<b>Confirm booking.</b> In production, submit validated shipment and document references to the selected provider.',
        '<b>Show courier confirmation.</b> Record shipment ID, provider booking reference, AWB, label, available invoice/customs documents and pickup state.',
        '<b>Pickup → International movement → Delivery.</b> Show courier milestones, including clearance/exception events when the provider supplies them.',
    ]) +
    heading('The international rate page must be explicit') + bullets([
        'Rates are comparable only when they describe the same parcel, route and included services.',
        'The demo shows shipping prices in INR. Declared goods currency is a separate field.',
        'Customs duties and destination taxes are excluded from the demo quote.',
        'Recording “Sender” or “Recipient” as duties payer is an instruction, not proof of a provider-supported duties-paid service.',
        'Production must validate the chosen duties arrangement against the selected carrier/service.',
    ]) +
    note('Required documents before confirming', 'The prototype blocks progression when invoice and sender identity document filenames are missing. “Use sample documents” adds demo filenames only. No real document is uploaded or reviewed.') +
    note('Current demo behaviour', 'WorldBridge and GlobalAir are fictional international providers. Their rates, transit estimates, booking confirmation and tracking events are illustrative.', 'warm'))

page('09 / REVIEW & CONFIRMATION', 'Check the booking before creating it', 'The review page joins the selected route, parcel, documents and collection instructions in one place.',
    heading('Review page checklist') + bullets([
        '<b>Shipment:</b> Domestic / International and Own logistics / External courier.',
        '<b>Addresses:</b> sender, receiver, complete pickup/delivery addresses, contact numbers and international email.',
        '<b>Parcel:</b> contents, quantity, weights, dimensions, declared goods value and currency.',
        '<b>Service:</b> provider or own branches, service type, estimated delivery and charge breakdown.',
        '<b>International:</b> customs declaration, invoice, document references and duties responsibility.',
        '<b>Collection:</b> freight payment type, collection/account method and credit party when required.',
    ]) +
    heading('Freight collection choices in the prototype') + table(['Payment type', 'Staff instruction', 'Available path'], [
        ['Paid', 'Record freight as paid at booking. Demo methods: Cash, UPI or company account.', 'Own + External'],
        ['To Pay', 'Collect the freight at delivery. Demo requires the full expected amount before own delivery completion.', 'Own only'],
        ['Credit', 'Require a credit party/account name and record the receivable arrangement.', 'Own only'],
        ['FOC', 'Customer freight is zero; retain the illustrative internal shipping cost.', 'Own only'],
    ]) +
    note('Separate three kinds of money', '<b>Customer freight collection</b> is different from <b>company settlement with a courier</b>, and both are different from the <b>CargoNest platform subscription</b>. The prototype records collection instructions; it does not process payments.') +
    heading('Confirmation page') + table(['Own logistics booking', 'External courier booking'], [
        ['Shipment ID, GRN and LR number.', 'Shipment ID, selected courier and AWB / tracking number.'],
        ['Demo booking receipt download.', 'Demo label download after simulated confirmation.'],
        ['Next: prepare loading and dispatch.', 'Next: pickup scheduling and carrier tracking.'],
        ['View shipment / create another shipment.', 'View shipment / create another shipment.'],
    ]) + p('Domestic and international booking confirmations retain their category. International documents and declaration details remain visible in the shipment record.') +
    note('Editing changes the quote context', 'Recheck serviceability and rates after address or parcel changes. Production must validate quote expiry and prevent duplicate bookings.'))

page('10 / EXECUTION & TRACKING', 'From booking to final delivery', 'Own-network actions are performed by staff. Courier movements are received from the partner in production.',
    heading('Own logistics operational pages') + table(['Queue / current state', 'Staff input', 'Action and next state'], [
        ['Loading / Booked', 'Select eligible shipment; vehicle / transport reference; driver or handling staff.', 'Confirm loading → <b>Loaded</b>.'],
        ['Dispatch / Loaded', 'Dispatch reference and remarks.', 'Confirm dispatch → <b>In transit</b>.'],
        ['Unloading / In transit', 'Receiving staff, destination receipt and remarks.', 'Confirm unloading → <b>Unloaded</b>.'],
        ['Delivery / Unloaded', 'Receiver name, contact, freight collected and remarks.', 'Complete delivery → <b>Delivered</b>.'],
    ]) + p('The demo lets one staff user explore both origin and destination actions. Production must restrict each operation to the assigned role, company, branch and eligible shipment state.') +
    heading('External courier tracking') + flow(['Booked → Pickup scheduled → Picked up', 'In transit → Out for delivery → Delivered']) + p('Production tracking should also preserve provider-specific details such as customs clearance, delivery attempts, delays and proof of delivery when available. These events do not need to become separate mandatory booking pages.') +
    heading('Shipment details page') + bullets([
        'Shows the timeline with current stage, event date/time and responsible staff/provider.',
        'Shows addresses, parcel details, selected service, quote breakdown and freight type.',
        'Shows own route references or the courier AWB and document actions.',
        'Shows international declaration and document references for overseas shipments.',
        'Offers only actions valid for the shipment’s current state.',
    ]) +
    heading('How staff finds a shipment') + p('<b>All shipments:</b> filter by category, fulfilment or status, and search ID, city, receiver or courier details. <b>Tracking:</b> enter a shipment ID, GRN, LR or AWB and open its details.') +
    note('Demo and existing backend status names differ', 'The prototype shows dispatch/In transit as a separate own-network step. The existing backend uses numeric stages: 0 Booked, 1 Loaded, 2 Unloaded, 3 Missing, 4 Delivered, 5 Cancelled. Define the production state mapping before connecting these screens.', 'warm'))

page('11 / EXCEPTIONS & SAFEGUARDS', 'When the normal path cannot continue', 'Keep the staff informed and prevent invalid, duplicate or misleading bookings.',
    table(['Situation', 'Expected product behaviour', 'Current prototype'], [
        ['Missing / invalid details', 'Highlight invalid fields; retain entered information; do not proceed.', 'Required fields, number ranges and basic input formats are checked.'],
        ['Own network lacks coverage', 'Explain the gap and continue to external services.', 'Implemented using demo branch matching.'],
        ['No external service available', 'Show no service; allow address/details correction or an alternative arrangement.', 'Production requirement; dummy partners always return sample services on the external path.'],
        ['International documents missing', 'Prevent final review/confirmation until required details are present.', 'Invoice + identity filenames required.'],
        ['Quote expired / changed', 'Refresh quote and ask staff to review the changed charges.', 'Production requirement; no live quote expiry in the demo.'],
        ['Carrier confirmation pending', 'Save a pending booking; check provider status before another booking attempt.', 'Production requirement; demo confirms immediately.'],
        ['Carrier booking failed', 'Show the reason; allow safe retry or another service; reconcile any collection/settlement.', 'Production requirement; no failure simulation.'],
        ['Cancel before operations', 'Check eligibility, cancel and record financial follow-up.', 'Demo marks Booked shipments cancelled; paid freight is noted for refund review.'],
        ['Cancel after movement begins', 'Use a controlled provider/company cancellation or return process.', 'No cancellation action offered after the first operation.'],
        ['Missing, damaged, delayed or returned parcel', 'Record exception, owner, resolution and any return/refund workflow.', 'Separate production design; not a complete demo workflow.'],
    ]) +
    heading('Production safeguards to preserve the intended flow') + bullets([
        'Enforce company, role and branch permissions on the server, including updates and deletes.',
        'Use allowed state transitions; prevent generic edits from bypassing loading or delivery rules.',
        'Keep the shipment, operation and financial updates consistent when a request fails.',
        'Make carrier booking and payment reconciliation safe to retry; deduplicate provider events.',
        'Treat quote totals, actual freight collected, refunds and subscription revenue separately.',
    ]) +
    note('Cancellation issue found during source review', 'The existing cancelBooking handler currently reports success without setting bookingStatus to 5. Fix and verify this before using that endpoint for the proposed cancellation behaviour.', 'warm'))

page('12 / SUPPORTING WORKSPACES', 'The pages around the shipment', 'Staff operations remain the primary experience; company setup supplies the network and access.',
    heading('Staff supporting screens') + table(['Screen', 'Purpose / click flow'], [
        ['Overview', 'View shipment counts, recent shipments, activity and network summary. New shipment opens the booking category page.'],
        ['Branch network', 'View own domestic and overseas branches, codes, locations and illustrative coverage. Try a sample route.'],
        ['Courier partners', 'Review available partner capabilities: rates, booking, tracking and label. Open a sample external journey.'],
        ['Reports', 'View domestic/international mix, own/external mix, status counts, shipping quote totals and the shipment register. Export CSV.'],
        ['Explore the demo', 'See the workflow map; open any of four sample journeys; reset browser demo records.'],
        ['Recent activity', 'Open the latest shipment updates and navigate to the selected shipment.'],
    ]) +
    heading('Company owner / admin setup flow') + note('Set up the company before daily operations', 'Company registration → Company login → Branches & coverage → Staff accounts & permissions → Courier connections → Rate/service settings → Billing settings → Operations ready.') +
    p('The existing backend already contains company, branch and staff setup and subscription endpoints. The new prototype concentrates on the shipping staff experience; it does not add complete interactive admin setup forms.') +
    table(['Setup area', 'Production responsibilities'], [
        ['Branch configuration', 'Real countries, branch addresses, pickup/delivery service areas, branch relationships and handling capability.'],
        ['Courier integrations', 'Provider credentials, domestic/international capabilities, rate access, booking, documents, tracking and cancellation support.'],
        ['Staff access', 'Individual logins, role permissions, assigned branches and permitted company operations.'],
        ['Business configuration', 'Own-route pricing, external billing/markup policy, credit rules, collection options and tax presentation.'],
    ]) +
    note('Platform owner is a different role', 'CargoNest platform-owner monitoring is separate from a logistics company’s shipping workspace. Customer freight values should not be reported as CargoNest subscription revenue.'))

page('13 / WALKTHROUGHS & DELIVERY SCOPE', 'Try every route. Know what is ready.', 'Use these samples to review the pages and confirm the business flow before production development.',
    table(['Sample journey', 'Clicks after New shipment', 'Result'], [
        ['Domestic own<br>Hyderabad → Vijayawada', 'Choose sample → details → coverage → own service → review → confirm.', 'GRN/LR → staff operations → delivery.'],
        ['Domestic external<br>Hyderabad → Jaipur', 'Choose sample → details → coverage → courier rates → select → review → confirm.', 'AWB → partner pickup/tracking → delivery.'],
        ['International own<br>Hyderabad → Dubai', 'Choose sample → details → coverage → own service → customs/documents → review → confirm.', 'Own overseas shipment → operations → delivery.'],
        ['International external<br>Hyderabad → London', 'Choose sample → details → coverage → partner rates → customs/documents → review → confirm.', 'International AWB → partner tracking → delivery.'],
    ]) +
    heading('What the working dummy prototype includes') + p('Clickable pages for all four journeys; simplified coverage; service selection and rate sorting; international document requirements; booking confirmation; own logistics queues; simulated partner tracking; search and filters; cancellation before movement; demo HTML documents; reports/CSV; local browser persistence and reset.') +
    heading('What still needs production implementation') + bullets([
        '<b>Coverage:</b> address-level branch serviceability, local delivery, final-mile and any mixed own/courier handovers.',
        '<b>Providers:</b> actual selected courier APIs, normalized quotes, real booking, pickup, tracking, labels and failure reconciliation.',
        '<b>International:</b> country/service-dependent documents, actual overseas operations and provider-supported duties arrangements.',
        '<b>Money:</b> own tariffs, final tax/fee rules, customer collection, courier settlement, credit ledger, cancellation/refunds.',
        '<b>Access & data:</b> server permissions, state mapping, audit history, uploads, transactional writes and existing-data compatibility.',
    ]) +
    heading('Terms used in this document') + p('<b>GRN / LR:</b> own-company parcel/consignment references. <b>AWB:</b> courier shipment tracking reference. <b>Serviceability:</b> whether a network can serve the entered addresses. <b>FOC:</b> free of customer freight charge. <b>HS code:</b> goods classification reference used in the international declaration.') +
    note('Prototype access & source', '<a href="https://cargonest-staff-flow-demo.gildedauk2.chatgpt.site">cargonest-staff-flow-demo.gildedauk2.chatgpt.site</a> (private hosted demo).<br>For local access, run <b>node preview.mjs</b> inside <b>prototypes/staff-shipping-flow</b>, then open <b>http://127.0.0.1:4175</b>. Hosted access may require the owner’s ChatGPT sign-in; local demo access does not.') +
    p('<b>Validation already performed:</b> all four sample bookings through final delivery, required international documents, To Pay collection check, shipment filters/lookup, cancellation, mobile layout, demo sign-in and reset were exercised in the browser. These checks cover the prototype, not live carrier or database integrations.'))

assert len(pages) == 14
css = '''
@page { size:A4; margin:0; }
* {box-sizing:border-box} html,body{margin:0;padding:0;color:#193b3b;font-family:"Segoe UI",Arial,sans-serif;font-size:10pt;background:#e9ede7;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;padding:15mm 18mm 17mm;background:#fff;position:relative;margin:0 auto 8mm;break-after:page;page-break-after:always;overflow:hidden}
.page:last-child{break-after:auto;page-break-after:auto}
header{display:flex;justify-content:space-between;border-bottom:1px solid #dfe6db;padding-bottom:4mm;margin-bottom:9mm;font-size:7pt;letter-spacing:1px;color:#7c8b80}
.kicker{font-size:8pt;letter-spacing:1.5px;color:#4a7856;font-weight:700;margin-bottom:3mm}
h1{font-size:25pt;letter-spacing:-1.1px;line-height:1.15;margin:0 0 3mm;font-weight:700} .lead{font-size:10.5pt;color:#6c7e73;line-height:1.4;margin-bottom:4mm}
h2{font-size:12pt;letter-spacing:-.2px;margin:4mm 0 2mm}h3{font-size:11pt;margin:0 0 2mm}
p{line-height:1.43;margin:1.8mm 0} ul,ol{padding-left:5mm;margin:2mm 0 2.5mm} li{line-height:1.4;margin-bottom:1.7mm;padding-left:.7mm}
table{width:100%;border-collapse:collapse;margin:2.5mm 0 3mm;table-layout:fixed;font-size:9pt}th{text-align:left;background:#edf3e7;color:#3f6346;font-size:8pt;padding:2mm;line-height:1.3}th:first-child{width:25%}td{border-bottom:1px solid #e2e8dd;padding:2mm;vertical-align:top;line-height:1.35;overflow-wrap:anywhere}td:first-child{font-weight:550}tr:nth-child(even) td{background:#fafcf8}
.note{background:#f0f5eb;border:1px solid #dbe6d1;border-left:3px solid #779b67;padding:3.5mm 4mm;margin:4mm 0;font-size:9pt;line-height:1.48;border-radius:1.5mm}.note strong{display:block;color:#3e6647;margin-bottom:1mm}.note.warm{background:#fcf3e9;border-color:#eedcc6;border-left-color:#dc9e6b}.note.warm strong{color:#97653d}
.flow{margin:3mm 0}.flow-node{background:#f2f6ed;border:1px solid #dfe8d6;padding:2.4mm 4mm;text-align:center;font-size:9.5pt;border-radius:2mm;line-height:1.4}.flow-arrow{display:block;text-align:center;color:#8aa27b;height:5mm;line-height:5mm;font-size:12pt}
.split{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin:4mm 0}.lane{border:1px solid #d6e4ca;background:#f5f8f0;padding:4mm;border-radius:2mm}.lane p{font-size:9pt;color:#6c7d63}.lane.warm{background:#fcf4e9;border-color:#efdec6}.mini-node{border-top:1px solid #dce6d4;margin-top:3mm;padding-top:3mm;font-size:9pt;line-height:1.5}
footer{position:absolute;bottom:9mm;left:18mm;right:18mm;display:flex;justify-content:space-between;border-top:1px solid #e0e7dc;padding-top:3mm;font-size:7pt;color:#82907f}
a{color:#246655;text-decoration:none} .cover{background:#153736;color:#f9fbf4;padding-top:20mm}.cover-top{display:flex;align-items:center;gap:3mm}.cover-top strong{font-size:20pt;letter-spacing:-.7px}.cover-top strong span{color:#c0d9a6}.logo{width:12mm;height:12mm;border:1px solid #b8d39d;border-radius:3mm;color:#c4dcae;display:grid;place-items:center;font-size:11pt;font-weight:bold}.version{margin-left:auto;color:#8ca69b;font-size:7pt;letter-spacing:1px}.cover-kicker{margin-top:30mm;font-size:9pt;letter-spacing:2px;color:#c2d8ac}.cover h1{font-size:49pt;letter-spacing:-2.4px;line-height:1.1;margin:7mm 0 8mm}.cover-sub{font-size:17pt;line-height:1.5;color:#bdd0bf}.cover-rule{width:20mm;height:1mm;background:#d89470;margin:11mm 0 8mm}.cover-description{font-size:12pt;line-height:1.65;max-width:145mm;color:#b9cdc0}.cover-tags{display:flex;gap:3mm;margin-top:9mm}.cover-tags span{font-size:7pt;letter-spacing:.7px;padding:2.5mm;border:1px solid #496459;border-radius:1.5mm;color:#c1d7ae}.cover-bottom{display:flex;justify-content:space-between;margin-top:15mm}.cover-bottom small{font-size:7pt;letter-spacing:1px;color:#90aa9e}.cover-bottom p{font-size:9pt;color:#e3ebdd}.cover-note{padding:4mm;border:1px solid #466457;border-radius:2mm;font-size:9pt;line-height:1.6;margin-top:6mm;color:#acc5b4}.cover-note b{color:#dbe8cf}.cover footer{border-color:#446254;color:#91ac9d}
.page:not(.cover){font-size:9.5pt}.page:not(.cover) header{margin-bottom:7mm}.page:not(.cover) h2{margin:3.5mm 0 1.8mm}.page:not(.cover) table{font-size:8.6pt;margin:2mm 0 2.5mm}.page:not(.cover) td,.page:not(.cover) th{padding:1.8mm;line-height:1.3}.page:not(.cover) .note{font-size:8.8pt;line-height:1.4;padding:3mm 3.5mm;margin:3mm 0}.page:not(.cover) li{line-height:1.36;margin-bottom:1.5mm}
.page:nth-of-type(10) table:last-of-type th:first-child{width:50%}
.page:nth-of-type(10) h2{margin-top:2.5mm}
@media print{body{background:white}.page{margin:0;box-shadow:none}}
'''
html='<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>CargoNest - Complete Staff Shipping Flow Blueprint</title><style>'+css+'</style></head><body>'+''.join(pages)+'</body></html>'
out=ROOT/'CargoNest-Complete-Shipping-Flow.html'
out.write_text(html,encoding='utf-8')
print(f'Created {out} ({len(pages)} designed pages).')
