# CargoNest Logistics
## Product Workflow Guide

Prepared: 30 October 2026

A plain-English explanation of how the product works. This guide describes the customer and staff journey. It contains no code or technical setup instructions.

## 1. The product at a glance

CargoNest is a shared logistics platform used by different companies. Each company registers its own business, sets up branches, creates staff accounts and manages its daily parcel operations.

The person who owns CargoNest monitors the platform through a separate owner dashboard. Customer company owners manage their own businesses. Staff members carry out the work assigned to their roles and branches.

### Overall journey

Company registration -> Company login -> Branch setup -> Admin/subadmin creation -> Staff setup -> Staff login -> Parcel booking -> Loading -> Unloading -> Delivery -> Reports.

A company receives 100 free bookings once. After that allowance is used, the company owner can pay INR 1,000 for 30 days of unlimited bookings.

## 2. Who uses the product?

| Person | What they do |
| --- | --- |
| Product owner | Monitors registered companies and overall platform activity |
| Company owner | Registers the business, manages branches and management accounts, updates the company logo letters and pays for the plan |
| Company admin | Manages permitted company operations, creates staff and reviews reports |
| Subadmin | Manages permitted operations within an assigned branch |
| Employee | Books parcels and performs permitted daily branch work |
| Other staff roles | Use the operational or account screens available to their assigned role |

The product owner and a customer company's owner are different people with different dashboards.

## 3. Company registration

A new customer opens Register your company and enters the business name, email and password. The customer can also enter contact information and optional logo letters.

The logo letters field accepts two letters. For example, a company called Example Logistics can enter EL. If the customer leaves the field empty, the platform creates initials from the company name.

After successful registration, the customer is taken to the common company login screen. Registering a company does not mean its employees already have accounts; the company must set up its team next.

### What the customer gets

- A company account for managing the business setup.
- A company identity and generated two-letter logo.
- A one-time allowance of 100 free bookings for that company.

There are no separate company-specific login links to share. Company owners use the common company login; staff use the common staff login.

## 4. First company login

The company owner signs in using the email and password entered during registration. The company workspace opens.

The workspace is used for business setup and management. It provides access to the company logo settings, branches, management accounts and Plan & Billing.

### Recommended first-time setup order

1. Review the company name and logo letters.
2. Create the first branch.
3. Create a company admin.
4. Create subadmins and assign them to the appropriate branches.
5. Ask the admin to create the required staff accounts.
6. Give each staff member their own login details.

An admin account can be created without assigning a branch. A subadmin needs an assigned branch, so the branch should exist first.

## 5. Branch setup

A branch represents a business location where parcels are booked, dispatched, received or delivered.

The owner or an authorized admin enters the branch name, branch type, city, location, address, phone number, PIN code and state. Optional contact fields can also be provided.

For example, a company may create a Hyderabad branch and a Vijayawada branch. Staff members can then be assigned to the relevant branch for their work.

The Create Branch action is inside the branch form. Once the required details are valid and the branch is created, it appears in the branch list. Authorized users can use the available edit or delete actions when needed.

## 6. Team setup and staff login

The company owner creates admins and subadmins from the company workspace. The staff admin can create the additional permitted staff accounts needed for operations.

Each person receives an individual account and role. Branch-based staff must be associated with the appropriate branch.

Staff members sign in through Staff login using their registered identifier and password. Their menus and available screens depend on their role.

### Why there are two login types

Company login is for company setup, management and plan payments. Staff login is for daily logistics work.

A company owner who also wants to perform staff operations uses a staff account for those operations in the current flow.

## 7. How the header works

After staff login, the header shows the company logo and name, available menus, branch information and the signed-in user.

| Action | Result |
| --- | --- |
| Click the company logo or company name | Opens the home screen for the signed-in role |
| Employee clicks the company logo | Returns to the employee booking screen |
| Click the username or avatar | Opens the account dropdown |
| Select My profile | Opens that user's profile details |
| Select Sign out | Ends the session and returns to login |
| Open a main menu | Shows the operations and reports available to the role |

The avatar, account dropdown and profile page all refer to the same signed-in person. They are not separate user profiles.

On smaller screens, the navigation strip remains available and the Menu control expands the options.

## 8. Creating a parcel booking

A staff member opens Parcel Booking and enters the shipment details.

### Step 1: Choose the route

Select the origin city, pickup branch, destination city, drop branch and dispatch type.

### Step 2: Choose the payment type for the parcel

| Booking type | Meaning |
| --- | --- |
| Paid | Freight is paid at booking |
| To pay | Freight is to be collected at delivery |
| Credit | Freight is recorded under the relevant credit arrangement; an agent is required |
| FOC | The parcel is booked free of freight charge |

Parcel freight payment and the company's CargoNest subscription payment are different things. An FOC parcel still counts as a created booking for the platform's free allowance.

### Step 3: Add package details

Enter the package quantity, package type, contents, weight and prices. Add more package rows when the shipment contains different items.

### Step 4: Review charges

Review service, handling, pickup, delivery and other applicable values. The form displays the grand total.

### Step 5: Enter customer details

Enter sender and receiver details, including names, phone numbers, addresses and GST information where applicable.

### Step 6: Submit

The platform checks the required details and the company's booking allowance. If the booking is allowed and saved successfully, shipment identifiers such as the GRN and LR number are generated. The available print screen can then be used.

If information is missing or invalid, the user must correct it before the booking can be completed. If the free allowance is exhausted and there is no active paid plan, a new booking is not allowed.

## 9. Free booking allowance

Each company gets 100 free bookings once. This is a shared company allowance, not 100 bookings for every employee or branch.

For example:

- Branch A creates 40 bookings.
- Branch B creates 35 bookings.
- Branch C creates 25 bookings.
- The company has now used all 100 free bookings.

The company workspace shows the remaining allowance. It changes from 100 out of 100 to 99 out of 100, 98 out of 100 and so on as free bookings are created.

Staff booking pages do not show a large pricing panel. When 10 or fewer free bookings remain, or access is exhausted or blocked, a small notice informs staff.

Cancelling a booking does not restore a free slot. The free allowance does not reset every month.

## 10. Paying for unlimited bookings

When more bookings are needed after the free allowance, the company owner signs in through Company login and opens Plan & Billing.

### Payment journey

1. The company owner selects Upgrade for INR 1,000.
2. Razorpay Checkout opens.
3. The owner chooses a payment method and completes payment.
4. The platform confirms that the payment succeeded.
5. Unlimited bookings become available for 30 days.
6. Staff can continue booking under the company's active plan.

Only the company owner initiates plan payments. Employees are directed to their company owner instead of being asked to pay themselves.

### Successful, failed and interrupted payments

- Confirmed payment: the company receives the paid booking period.
- Failed or cancelled payment: the plan does not activate.
- Payment appears charged but confirmation is pending: the owner uses Check payment in the payment history before paying again.

This is a manual renewal plan. It does not automatically debit the company each month.

If the owner renews before expiry, the new paid period extends the existing validity. After expiry, unlimited access ends. If the free allowance has already been used, the company must renew to create more bookings.

Existing business records are not deleted when a plan expires. Viewing or using particular screens continues to follow the account's permissions and company access rules.

## 11. From booking to delivery

### Booking

A new parcel is recorded with its route, customers, packages and charges.

### Loading and dispatch

Authorized staff select the relevant booked parcels for dispatch and record the loading operation. The shipment moves to the loaded stage.

### Unloading or receipt

The receiving branch records the arrival and unloading of the parcels. If another branch must handle the shipment, the relevant transfer process is followed.

### Delivery

Authorized staff complete the delivery from the appropriate branch, record receiver details and enter collection information where required. The shipment is marked delivered.

### Exceptions

A shipment may follow a missing or cancellation process when necessary. These are separate operational actions and are not the normal delivery path.

The displayed shipment stages include Booked, Loaded, Unloaded, Missing, Delivered and Cancelled.

## 12. Finding an existing shipment

Staff can use Find a shipment to search by GRN number, LR number, mobile number or customer name.

Enter the search value and select Find shipment. Available parcel information is displayed for review. Clear resets the search value.

Search helps staff answer customer queries and locate existing shipments without creating another booking.

## 13. Reports and business review

Authorized users open the report relevant to their work, choose the available dates or other filters, and review the results.

Reports can cover bookings, collections, branch accounts, delivery, pending stock, dispatch, received stock, movement and vouchers.

The admin dashboard brings together shipment-stage totals and operational summaries. Available print/export options depend on the report screen.

Reports help the business answer questions such as:

- How many parcels were booked in a period?
- Which shipments are waiting for dispatch or delivery?
- What freight or collections were recorded?
- Which branch handled the activity?

Staff see the reports available to their role and company context.

## 14. What the product owner sees

The CargoNest product owner uses a separate private owner dashboard. Customer staff do not use this dashboard.

The owner can review registered companies, branch totals, registration trends, booking activity and the company directory. Search, filters and CSV export support platform monitoring.

Customer parcel freight value is not the same as CargoNest subscription revenue. Subscription payments and customer shipment charges must be understood separately.

## 15. Example: one company using the product

Example Logistics registers its business and uses EL as its logo letters. The owner signs in, creates two branches and creates an admin and branch subadmins.

The admin creates employees for the branches. An employee signs in, opens Parcel Booking, enters a route and customer details, adds packages and saves the booking.

The company's remaining free allowance decreases by one. Dispatch staff load the parcel, the destination branch unloads it, and delivery staff complete delivery and record any collection.

The admin reviews the reports. When the company's combined free bookings reach 100, the owner pays INR 1,000 through Plan & Billing. After payment is confirmed, the company's staff can create unlimited bookings for 30 days.

The product owner separately reviews platform activity in the owner dashboard.

## 16. Quick flow summary

| Stage | Responsible person | Outcome |
| --- | --- | --- |
| Register company | Company owner | Business account created |
| Set up branches | Company owner or authorized admin | Business locations available |
| Create management/team accounts | Company owner and admin | Individual staff access ready |
| Sign in for operations | Staff member | Role-based menus available |
| Create booking | Authorized staff | Shipment recorded; allowance checked |
| Load and unload | Authorized branch staff | Shipment movement recorded |
| Complete delivery | Authorized staff | Receiver and collection information recorded |
| Review reports | Authorized managers/staff | Operational information available |
| Upgrade or renew | Company owner | Confirmed 30-day unlimited booking period |
| Monitor platform | Product owner | Overall company and activity overview |

End of workflow guide.
