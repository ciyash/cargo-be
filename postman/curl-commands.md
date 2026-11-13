# Cargo Logistics cURL commands

Paste any command into Postman > Import > Raw text. Replace placeholders with your own data first. These are Bash-style cURL commands; use Postman import on Windows.

## GET /company/branding

```bash
curl --request GET --url 'http://localhost:4000/company/branding' --header 'Authorization: Bearer REPLACE_companyToken'
```

## POST /company/register

```bash
curl --request POST --url 'http://localhost:4000/company/register' --header 'Content-Type: application/json' --data-raw '{}'
```

## POST /company/login

```bash
curl --request POST --url 'http://localhost:4000/company/login' --header 'Content-Type: application/json' --data-raw '{
  "email": "company@example.com",
  "password": "ChangeMe123!"
}'
```

## GET /company/branches

```bash
curl --request GET --url 'http://localhost:4000/company/branches' --header 'Authorization: Bearer REPLACE_companyToken'
```

## POST /company/branches

```bash
curl --request POST --url 'http://localhost:4000/company/branches' --header 'Authorization: Bearer REPLACE_companyToken' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "openingBalance": 0,
  "branchType": "normal",
  "city": "Hyderabad",
  "cityId": "Sample cityId",
  "location": "Main Road",
  "branchDate": "2026-10-29",
  "branchStatus": "Sample branchStatus",
  "address": "Sample street",
  "phone": "9000000001",
  "pincode": 500001,
  "state": "Telangana",
  "country": "India",
  "alternateMobile": "Sample alternateMobile",
  "ownershipType": "Sample ownershipType",
  "servicePostalCodes": "Sample servicePostalCodes",
  "courierPickupLocation": "Sample courierPickupLocation",
  "delhiveryPickupLocation": "Sample delhiveryPickupLocation"
}'
```

## POST /company/subsidiary/register

```bash
curl --request POST --url 'http://localhost:4000/company/subsidiary/register' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "email": "company@example.com",
  "password": "ChangeMe123!",
  "parentCompanyId": null,
  "phone": "9000000001",
  "address": "Sample street",
  "state": "Telangana",
  "customerName": "Sample customerName",
  "logoText": "Sample logoText"
}'
```

## POST /company/subsidiary/login

```bash
curl --request POST --url 'http://localhost:4000/company/subsidiary/login' --header 'Content-Type: application/json' --data-raw '{
  "email": "company@example.com",
  "password": "ChangeMe123!"
}'
```

## POST /company/company-access

```bash
curl --request POST --url 'http://localhost:4000/company/company-access' --header 'Authorization: Bearer REPLACE_companyToken' --header 'Content-Type: application/json' --data-raw '{}'
```

## GET /company/get-companies

```bash
curl --request GET --url 'http://localhost:4000/company/get-companies' --header 'Authorization: Bearer REPLACE_companyToken'
```

## PATCH /company/update

```bash
curl --request PATCH --url 'http://localhost:4000/company/update' --header 'Authorization: Bearer REPLACE_companyToken' --header 'Content-Type: application/json' --data-raw '{
  "logoText": "Sample logoText",
  "password": "ChangeMe123!"
}'
```

## GET /company/subsidiaries/:parentCompanyId

```bash
curl --request GET --url 'http://localhost:4000/company/subsidiaries/REPLACE_parentCompanyId' --header 'Authorization: Bearer REPLACE_companyToken'
```

## DELETE /company/delete/:id

```bash
curl --request DELETE --url 'http://localhost:4000/company/delete/REPLACE_id' --header 'Authorization: Bearer REPLACE_companyToken'
```

## POST /company/subscription

```bash
curl --request POST --url 'http://localhost:4000/company/subscription' --header 'Authorization: Bearer REPLACE_companyToken' --header 'Content-Type: application/json' --data-raw '{}'
```

## GET /company/check/membership/:companyId

```bash
curl --request GET --url 'http://localhost:4000/company/check/membership/REPLACE_companyId'
```

## POST /subadmin-auth/delete-person

```bash
curl --request POST --url 'http://localhost:4000/subadmin-auth/delete-person' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "id": "REPLACE_id"
}'
```

## POST /subadmin-auth/signup-by-company

```bash
curl --request POST --url 'http://localhost:4000/subadmin-auth/signup-by-company' --header 'Authorization: Bearer REPLACE_companyToken' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "username": "sample_admin",
  "address": "Sample street",
  "phone": "9000000001",
  "email": "sample@example.com",
  "password": "ChangeMe123!",
  "branchId": "REPLACE_branchId",
  "location": "Main Road",
  "documents": [],
  "role": "company_admin",
  "branchCity": "Sample branchCity"
}'
```

## POST /subadmin-auth/signup

```bash
curl --request POST --url 'http://localhost:4000/subadmin-auth/signup' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "username": "sample_admin",
  "address": "Sample street",
  "phone": "9000000001",
  "email": "sample@example.com",
  "password": "ChangeMe123!",
  "branchId": "REPLACE_branchId",
  "location": "Main Road",
  "documents": [],
  "role": "company_admin",
  "branchCity": "Sample branchCity"
}'
```

## POST /subadmin-auth/login

```bash
curl --request POST --url 'http://localhost:4000/subadmin-auth/login' --header 'Content-Type: application/json' --data-raw '{
  "identifier": "admin@example.com",
  "password": "ChangeMe123!",
  "companyId": "REPLACE_companyId"
}'
```

## GET /subadmin-auth/subadmins

```bash
curl --request GET --url 'http://localhost:4000/subadmin-auth/subadmins' --header 'Authorization: Bearer REPLACE_companyToken'
```

## GET /subadmin-auth/employees

```bash
curl --request GET --url 'http://localhost:4000/subadmin-auth/employees' --header 'Authorization: Bearer REPLACE_token'
```

## GET /subadmin-auth/profile

```bash
curl --request GET --url 'http://localhost:4000/subadmin-auth/profile' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /subadmin-auth/admin-profile

```bash
curl --request PATCH --url 'http://localhost:4000/subadmin-auth/admin-profile' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "email": "sample@example.com",
  "phone": "9000000001",
  "name": "Sample",
  "location": "Main Road",
  "branchId": "REPLACE_branchId",
  "address": "Sample street",
  "password": "ChangeMe123!",
  "documents": []
}'
```

## PATCH /subadmin-auth/update-profile/:id

```bash
curl --request PATCH --url 'http://localhost:4000/subadmin-auth/update-profile/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "email": "sample@example.com",
  "username": "sample_admin",
  "phone": "9000000001",
  "password": "ChangeMe123!"
}'
```

## PATCH /subadmin-auth/account-status/:id

```bash
curl --request PATCH --url 'http://localhost:4000/subadmin-auth/account-status/REPLACE_id' --header 'Authorization: Bearer REPLACE_companyToken' --header 'Content-Type: application/json' --data-raw '{
  "isBlocked": "Sample isBlocked"
}'
```

## POST /subadmin-auth/change-password

```bash
curl --request POST --url 'http://localhost:4000/subadmin-auth/change-password' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "oldPassword": "ChangeMe123!",
  "newPassword": "NewPassword123!"
}'
```

## POST /subadmin-auth/reset-password

```bash
curl --request POST --url 'http://localhost:4000/subadmin-auth/reset-password' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "email": "sample@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123!"
}'
```

## POST /subadmin-auth/forgot-password

```bash
curl --request POST --url 'http://localhost:4000/subadmin-auth/forgot-password' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "email": "sample@example.com"
}'
```

## DELETE /subadmin-auth/delete-subadmin

```bash
curl --request DELETE --url 'http://localhost:4000/subadmin-auth/delete-subadmin' --header 'Authorization: Bearer REPLACE_token'
```

## GET /subadmin-auth/branch-wise/:branchName

```bash
curl --request GET --url 'http://localhost:4000/subadmin-auth/branch-wise/Main Branch' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "branchName": "Main Branch"
}'
```

## POST /branch

```bash
curl --request POST --url 'http://localhost:4000/branch' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "openingBalance": 0,
  "branchType": "normal",
  "city": "Hyderabad",
  "cityId": "Sample cityId",
  "location": "Main Road",
  "branchDate": "2026-10-29",
  "branchStatus": "Sample branchStatus",
  "address": "Sample street",
  "phone": "9000000001",
  "pincode": 500001,
  "state": "Telangana",
  "country": "India",
  "alternateMobile": "Sample alternateMobile",
  "ownershipType": "Sample ownershipType",
  "servicePostalCodes": "Sample servicePostalCodes",
  "courierPickupLocation": "Sample courierPickupLocation",
  "delhiveryPickupLocation": "Sample delhiveryPickupLocation"
}'
```

## GET /branch

```bash
curl --request GET --url 'http://localhost:4000/branch' --header 'Authorization: Bearer REPLACE_token'
```

## GET /branch/branchUniqueId/:branchUniqueId

```bash
curl --request GET --url 'http://localhost:4000/branch/branchUniqueId/REPLACE_branchUniqueId' --header 'Authorization: Bearer REPLACE_token'
```

## GET /branch/subadminUniqueId/:subadminUniqueId

```bash
curl --request GET --url 'http://localhost:4000/branch/subadminUniqueId/REPLACE_subadminUniqueId' --header 'Authorization: Bearer REPLACE_token'
```

## POST /branch/dateRange

```bash
curl --request POST --url 'http://localhost:4000/branch/dateRange' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "startDate": "2026-10-01",
  "endDate": "2026-10-29"
}'
```

## GET /branch/:id

```bash
curl --request GET --url 'http://localhost:4000/branch/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /branch/update/:id

```bash
curl --request PATCH --url 'http://localhost:4000/branch/update/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "cityId": "Sample cityId",
  "city": "Hyderabad",
  "country": "India"
}'
```

## DELETE /branch/delete/:id

```bash
curl --request DELETE --url 'http://localhost:4000/branch/delete/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## GET /branch/city/:city

```bash
curl --request GET --url 'http://localhost:4000/branch/city/Hyderabad?companyId=REPLACE_companyId' --header 'Authorization: Bearer REPLACE_token'
```

## GET /booking/users

```bash
curl --request GET --url 'http://localhost:4000/booking/users' --header 'Authorization: Bearer REPLACE_token'
```

## GET /booking/users/search

```bash
curl --request GET --url 'http://localhost:4000/booking/users/search?query=Test' --header 'Authorization: Bearer REPLACE_token'
```

## GET /booking/user/:senderMobile

```bash
curl --request GET --url 'http://localhost:4000/booking/user/9000000001' --header 'Authorization: Bearer REPLACE_token'
```

## GET /booking/user/credit

```bash
curl --request GET --url 'http://localhost:4000/booking/user/credit' --header 'Authorization: Bearer REPLACE_token'
```

## DELETE /booking/user/delete-phone/:phone

```bash
curl --request DELETE --url 'http://localhost:4000/booking/user/delete-phone/9000000001' --header 'Authorization: Bearer REPLACE_token'
```

## POST /booking

```bash
curl --request POST --url 'http://localhost:4000/booking' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "dropBranch": "REPLACE_dropBranch",
  "dispatchType": "Road",
  "bookingType": "paid",
  "packages": [
    {
      "quantity": 1,
      "packageType": "Box",
      "contains": "Clothes",
      "weight": 5,
      "unitPrice": 100,
      "totalPrice": 100,
      "actulWeight": "5"
    }
  ],
  "senderName": "Test Sender",
  "senderMobile": 9000000001,
  "senderAddress": "Hyderabad",
  "receiverName": "Test Receiver",
  "receiverMobile": 9000000002,
  "receiverAddress": "Vijayawada",
  "grandTotal": 100,
  "serviceCharges": 0,
  "hamaliCharges": 0,
  "doorDeliveryCharges": 0,
  "doorPickupCharges": 0,
  "parcelGstAmount": 0,
  "valueOfGoods": 0,
  "items": 1
}'
```

## GET /booking

```bash
curl --request GET --url 'http://localhost:4000/booking' --header 'Authorization: Bearer REPLACE_token'
```

## GET /booking/todaybookings

```bash
curl --request GET --url 'http://localhost:4000/booking/todaybookings' --header 'Authorization: Bearer REPLACE_token'
```

## GET /booking/grnNo/:grnNo

```bash
curl --request GET --url 'http://localhost:4000/booking/grnNo/1001' --header 'Authorization: Bearer REPLACE_token'
```

## GET /booking/adminUniqueId/:adminUniqueId

```bash
curl --request GET --url 'http://localhost:4000/booking/adminUniqueId/REPLACE_adminUniqueId' --header 'Authorization: Bearer REPLACE_token'
```

## POST /booking/search-data

```bash
curl --request POST --url 'http://localhost:4000/booking/search-data' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "mobile": "9000000001",
  "searchCustomer": "Test Sender",
  "grnNo": "1001",
  "lrNumber": "REPLACE_WITH_EXISTING_LR"
}'
```

## GET /booking/pages

```bash
curl --request GET --url 'http://localhost:4000/booking/pages?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token'
```

## GET /booking/fromCity/:fromCity/toCity/:toCity/:vehicalNumber

```bash
curl --request GET --url 'http://localhost:4000/booking/fromCity/Hyderabad/toCity/Vijayawada/TS09AB1234' --header 'Authorization: Bearer REPLACE_token'
```

## POST /booking/get-lrNumber

```bash
curl --request POST --url 'http://localhost:4000/booking/get-lrNumber' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "lrNumber": "REPLACE_WITH_EXISTING_LR"
}'
```

## DELETE /booking/:id

```bash
curl --request DELETE --url 'http://localhost:4000/booking/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /booking/:id

```bash
curl --request PATCH --url 'http://localhost:4000/booking/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "remarks": "Updated booking"
}'
```

## PATCH /booking/grnNo/:grnNo

```bash
curl --request PATCH --url 'http://localhost:4000/booking/grnNo/1001' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "remarks": "Updated booking"
}'
```

## POST /booking/updateAllGrnNumbers

```bash
curl --request POST --url 'http://localhost:4000/booking/updateAllGrnNumbers' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "grnNumbers": [
    1001
  ],
  "updateFields": {
    "remarks": "Updated during testing"
  }
}'
```

## POST /booking/delivery-booking

```bash
curl --request POST --url 'http://localhost:4000/booking/delivery-booking' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "grnNo": 1001,
  "receiverName": "Test Receiver",
  "receiverMobile": 9000000002,
  "toPayDeliveredAmount": 100
}'
```

## GET /booking/get-deliveries

```bash
curl --request GET --url 'http://localhost:4000/booking/get-deliveries' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /booking/update/:id

```bash
curl --request PATCH --url 'http://localhost:4000/booking/update/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "receiverName": "Updated Receiver"
}'
```

## POST /booking/cancelBooking/:grnNo

```bash
curl --request POST --url 'http://localhost:4000/booking/cancelBooking/1001' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{}'
```

## POST /booking/markParcelAsMissing/:grnNo

```bash
curl --request POST --url 'http://localhost:4000/booking/markParcelAsMissing/1001' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "missingReason": "Test missing report",
  "missingDate": "2026-10-29",
  "missingByUser": "REPLACE_id"
}'
```

## POST /booking/delivery-report

```bash
curl --request POST --url 'http://localhost:4000/booking/delivery-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "deliveryBranch": "REPLACE_pickUpBranch"
}'
```

## POST /booking/parcel-booking-report

```bash
curl --request POST --url 'http://localhost:4000/booking/parcel-booking-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "bookingStatus": 0,
  "bookingType": "paid",
  "branch": "REPLACE_pickUpBranch"
}'
```

## POST /booking/all-parcel-booking-report

```bash
curl --request POST --url 'http://localhost:4000/booking/all-parcel-booking-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "startDate": "2026-10-01",
  "endDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "dropBranch": "REPLACE_dropBranch",
  "bookingStatus": 0,
  "vehicalNumber": "TS09AB1234"
}'
```

## POST /booking/parcel-report-serialNo

```bash
curl --request POST --url 'http://localhost:4000/booking/parcel-report-serialNo?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada"
}'
```

## POST /booking/parcel-cancel-report

```bash
curl --request POST --url 'http://localhost:4000/booking/parcel-cancel-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "bookingType": "paid"
}'
```

## POST /booking/parcel-booking-summary-report

```bash
curl --request POST --url 'http://localhost:4000/booking/parcel-booking-summary-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "dropBranch": "REPLACE_dropBranch"
}'
```

## POST /booking/parcel-booking-mobileNumber

```bash
curl --request POST --url 'http://localhost:4000/booking/parcel-booking-mobileNumber?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "mobile": "9000000001",
  "bookingType": "paid",
  "bookingStatus": 0,
  "reportType": "sender",
  "fromCity": "Hyderabad",
  "pickUpBranch": "REPLACE_pickUpBranch"
}'
```

## POST /booking/regular-customer-booking

```bash
curl --request POST --url 'http://localhost:4000/booking/regular-customer-booking?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "dropBranch": "REPLACE_dropBranch",
  "name": "Sample"
}'
```

## POST /booking/branch-Wise-collection-report

```bash
curl --request POST --url 'http://localhost:4000/booking/branch-Wise-collection-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "bookedBy": "REPLACE_id"
}'
```

## POST /booking/collection-summary-report

```bash
curl --request POST --url 'http://localhost:4000/booking/collection-summary-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "bookedBy": "REPLACE_id"
}'
```

## POST /booking/collection-toPay-report

```bash
curl --request POST --url 'http://localhost:4000/booking/collection-toPay-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "bookedBy": "REPLACE_id"
}'
```

## POST /booking/all-collection-report

```bash
curl --request POST --url 'http://localhost:4000/booking/all-collection-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "bookedBy": "REPLACE_id"
}'
```

## POST /booking/booking-typew-ise-collection

```bash
curl --request POST --url 'http://localhost:4000/booking/booking-typew-ise-collection?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "bookedBy": "REPLACE_id"
}'
```

## POST /booking/parcel-branch-consolidated-report

```bash
curl --request POST --url 'http://localhost:4000/booking/parcel-branch-consolidated-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "pickUpBranch": "REPLACE_pickUpBranch"
}'
```

## POST /booking/consolidated-report-branch

```bash
curl --request POST --url 'http://localhost:4000/booking/consolidated-report-branch?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "toCity": "Vijayawada"
}'
```

## POST /booking/parcel-branch-wise-gst-report

```bash
curl --request POST --url 'http://localhost:4000/booking/parcel-branch-wise-gst-report' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "pickUpBranch": "REPLACE_pickUpBranch"
}'
```

## POST /booking/sender-receiver-gst-report

```bash
curl --request POST --url 'http://localhost:4000/booking/sender-receiver-gst-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "branchCity": "Sample branchCity",
  "branchName": "Main Branch"
}'
```

## POST /booking/pending-delivery-stock-report

```bash
curl --request POST --url 'http://localhost:4000/booking/pending-delivery-stock-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "dropBranch": "REPLACE_dropBranch",
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29"
}'
```

## POST /booking/parcel-status-date-difference-report

```bash
curl --request POST --url 'http://localhost:4000/booking/parcel-status-date-difference-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "startDate": "2026-10-01",
  "endDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "bookingStatus": 0
}'
```

## POST /booking/pending-delivery-luggage-report

```bash
curl --request POST --url 'http://localhost:4000/booking/pending-delivery-luggage-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "dropBranch": "REPLACE_dropBranch",
  "bookingType": "paid"
}'
```

## POST /booking/parcel-received-stock-report

```bash
curl --request POST --url 'http://localhost:4000/booking/parcel-received-stock-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "dropBranch": "REPLACE_dropBranch",
  "receiverName": "Test Receiver"
}'
```

## POST /booking/delivered-stock-report

```bash
curl --request POST --url 'http://localhost:4000/booking/delivered-stock-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "dropBranch": "REPLACE_dropBranch"
}'
```

## POST /booking/pending-dispatch-stock-report

```bash
curl --request POST --url 'http://localhost:4000/booking/pending-dispatch-stock-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29"
}'
```

## POST /booking/dispatched-memo-report

```bash
curl --request POST --url 'http://localhost:4000/booking/dispatched-memo-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "dropBranch": "REPLACE_dropBranch",
  "vehicalNumber": "TS09AB1234"
}'
```

## POST /booking/parcel-incoming-luggages-report

```bash
curl --request POST --url 'http://localhost:4000/booking/parcel-incoming-luggages-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "pickUpBranch": "REPLACE_pickUpBranch",
  "dropBranch": "REPLACE_dropBranch"
}'
```

## POST /booking/grnNolrNo

```bash
curl --request POST --url 'http://localhost:4000/booking/grnNolrNo' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "grnlrn": "REPLACE_WITH_EXISTING_LR"
}'
```

## GET /booking/get-above700

```bash
curl --request GET --url 'http://localhost:4000/booking/get-above700' --header 'Authorization: Bearer REPLACE_token'
```

## POST /booking/sales-summary-branchwise

```bash
curl --request POST --url 'http://localhost:4000/booking/sales-summary-branchwise?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "date": "2026-10-29"
}'
```

## POST /booking/summary-report

```bash
curl --request POST --url 'http://localhost:4000/booking/summary-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "selectedDate": "2026-10-29"
}'
```

## POST /booking/branch-account

```bash
curl --request POST --url 'http://localhost:4000/booking/branch-account?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "date": "2026-10-29"
}'
```

## POST /booking/acparty-account

```bash
curl --request POST --url 'http://localhost:4000/booking/acparty-account?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "date": "2026-10-29"
}'
```

## GET /booking/status-wise-summary

```bash
curl --request GET --url 'http://localhost:4000/booking/status-wise-summary?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token'
```

## GET /booking/get-total

```bash
curl --request GET --url 'http://localhost:4000/booking/get-total' --header 'Authorization: Bearer REPLACE_token'
```

## POST /vehicle

```bash
curl --request POST --url 'http://localhost:4000/vehicle' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "vehicleNo": "TS09AB1234",
  "vehicleType": "Truck",
  "registrationNo": "TS09AB1234",
  "date": "2026-10-29",
  "RC": "TEST-RC",
  "polutionExpDate": "2027-10-29",
  "fuelType": "DIESEL",
  "branch": "REPLACE_pickUpBranch",
  "vehicleStatus": "active"
}'
```

## GET /vehicle

```bash
curl --request GET --url 'http://localhost:4000/vehicle' --header 'Authorization: Bearer REPLACE_token'
```

## GET /vehicle/:id

```bash
curl --request GET --url 'http://localhost:4000/vehicle/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## GET /vehicle/getVehicleNo/:vehicleNo

```bash
curl --request GET --url 'http://localhost:4000/vehicle/getVehicleNo/TS09AB1234' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /vehicle/:id

```bash
curl --request PATCH --url 'http://localhost:4000/vehicle/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "vehicleStatus": "active"
}'
```

## DELETE /vehicle/:id

```bash
curl --request DELETE --url 'http://localhost:4000/vehicle/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## GET /vehicle/status/:status

```bash
curl --request GET --url 'http://localhost:4000/vehicle/status/active' --header 'Authorization: Bearer REPLACE_token'
```

## POST /parcel-loading/parcel-loding-load

```bash
curl --request POST --url 'http://localhost:4000/parcel-loading/parcel-loding-load?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "startDate": "2026-10-01",
  "endDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "pickUpBranch": "REPLACE_pickUpBranch"
}'
```

## POST /parcel-loading

```bash
curl --request POST --url 'http://localhost:4000/parcel-loading' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromCity": "Hyderabad",
  "toCity": [
    "Vijayawada"
  ],
  "fromBranch": "REPLACE_pickUpBranch",
  "vehicalNumber": "TS09AB1234",
  "driverName": "Test Driver",
  "driverNo": 9000000001,
  "grnNo": [
    1001
  ],
  "lrNumber": [
    "REPLACE_WITH_EXISTING_LR"
  ],
  "remarks": "Postman test"
}'
```

## GET /parcel-loading

```bash
curl --request GET --url 'http://localhost:4000/parcel-loading' --header 'Authorization: Bearer REPLACE_token'
```

## GET /parcel-loading/:id

```bash
curl --request GET --url 'http://localhost:4000/parcel-loading/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## GET /parcel-loading/vocherNoUnique/:vocherNoUnique

```bash
curl --request GET --url 'http://localhost:4000/parcel-loading/vocherNoUnique/1001' --header 'Authorization: Bearer REPLACE_token'
```

## GET /parcel-loading/voucher-details-print/:vocherNoUnique

```bash
curl --request GET --url 'http://localhost:4000/parcel-loading/voucher-details-print/1001' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /parcel-loading/:id

```bash
curl --request PATCH --url 'http://localhost:4000/parcel-loading/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "remarks": "Updated loading"
}'
```

## DELETE /parcel-loading/:id

```bash
curl --request DELETE --url 'http://localhost:4000/parcel-loading/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /parcel-loading/updateGrnNumbers

```bash
curl --request POST --url 'http://localhost:4000/parcel-loading/updateGrnNumbers' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "grnNumbers": [
    1001
  ],
  "updateFields": {
    "remarks": "Updated during testing"
  }
}'
```

## POST /parcel-loading/get-lrNumber

```bash
curl --request POST --url 'http://localhost:4000/parcel-loading/get-lrNumber' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "lrNumber": "REPLACE_WITH_EXISTING_LR"
}'
```

## GET /parcel-loading/grnNo/:grnNo

```bash
curl --request GET --url 'http://localhost:4000/parcel-loading/grnNo/1001' --header 'Authorization: Bearer REPLACE_token'
```

## GET /parcel-loading/vehicalNumber/:vehicalNumber

```bash
curl --request GET --url 'http://localhost:4000/parcel-loading/vehicalNumber/TS09AB1234' --header 'Authorization: Bearer REPLACE_token'
```

## POST /parcel-loading/offline-parcel-voucher-details

```bash
curl --request POST --url 'http://localhost:4000/parcel-loading/offline-parcel-voucher-details?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "vehicalNumber": "TS09AB1234",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "fromBranch": "REPLACE_pickUpBranch"
}'
```

## POST /parcel-loading/parcel-offline-report

```bash
curl --request POST --url 'http://localhost:4000/parcel-loading/parcel-offline-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "fromBranch": "REPLACE_pickUpBranch"
}'
```

## POST /parcel-loading/parcel-status-report

```bash
curl --request POST --url 'http://localhost:4000/parcel-loading/parcel-status-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "startDate": "2026-10-01",
  "endDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "parcelStatus": 0
}'
```

## POST /parcel-loading/parcel-pending-report

```bash
curl --request POST --url 'http://localhost:4000/parcel-loading/parcel-pending-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "fromBranch": "REPLACE_pickUpBranch",
  "toBranch": "REPLACE_dropBranch"
}'
```

## POST /parcel-loading/branch-to-branch-load

```bash
curl --request POST --url 'http://localhost:4000/parcel-loading/branch-to-branch-load?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromBookingDate": "2026-10-01",
  "toBookingDate": "2026-10-29",
  "fromBranch": "REPLACE_pickUpBranch"
}'
```

## POST /parcel-loading/branch-to-branch-post

```bash
curl --request POST --url 'http://localhost:4000/parcel-loading/branch-to-branch-post' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromCity": "Hyderabad",
  "toCity": [
    "Vijayawada"
  ],
  "fromBranch": "REPLACE_pickUpBranch",
  "vehicalNumber": "TS09AB1234",
  "driverName": "Test Driver",
  "driverNo": 9000000001,
  "grnNo": [
    1001
  ],
  "lrNumber": [
    "REPLACE_WITH_EXISTING_LR"
  ],
  "remarks": "Postman test"
}'
```

## POST /parcel-loading/dispatched-stock-report

```bash
curl --request POST --url 'http://localhost:4000/parcel-loading/dispatched-stock-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "fromBranch": "REPLACE_pickUpBranch"
}'
```

## POST /multi-router/cities

```bash
curl --request POST --url 'http://localhost:4000/multi-router/cities' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{}'
```

## GET /multi-router/cities

```bash
curl --request GET --url 'http://localhost:4000/multi-router/cities' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /multi-router/cities/:id

```bash
curl --request PATCH --url 'http://localhost:4000/multi-router/cities/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "cityName": "Hyderabad"
}'
```

## DELETE /multi-router/cities/:id

```bash
curl --request DELETE --url 'http://localhost:4000/multi-router/cities/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /multi-router/cities/delete-cities

```bash
curl --request POST --url 'http://localhost:4000/multi-router/cities/delete-cities' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{}'
```

## POST /multi-router/dispatch-types

```bash
curl --request POST --url 'http://localhost:4000/multi-router/dispatch-types' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "isActive": true
}'
```

## GET /multi-router/dispatch-types

```bash
curl --request GET --url 'http://localhost:4000/multi-router/dispatch-types' --header 'Authorization: Bearer REPLACE_token'
```

## GET /multi-router/dispatch-types/:id

```bash
curl --request GET --url 'http://localhost:4000/multi-router/dispatch-types/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /multi-router/dispatch-types/:id

```bash
curl --request PATCH --url 'http://localhost:4000/multi-router/dispatch-types/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "isActive": true
}'
```

## DELETE /multi-router/dispatch-types/:id

```bash
curl --request DELETE --url 'http://localhost:4000/multi-router/dispatch-types/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /multi-router/package-types

```bash
curl --request POST --url 'http://localhost:4000/multi-router/package-types' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample"
}'
```

## GET /multi-router/package-types

```bash
curl --request GET --url 'http://localhost:4000/multi-router/package-types' --header 'Authorization: Bearer REPLACE_token'
```

## GET /multi-router/package-types/:id

```bash
curl --request GET --url 'http://localhost:4000/multi-router/package-types/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /multi-router/package-types/:id

```bash
curl --request PATCH --url 'http://localhost:4000/multi-router/package-types/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample"
}'
```

## DELETE /multi-router/package-types/:id

```bash
curl --request DELETE --url 'http://localhost:4000/multi-router/package-types/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /multi-router/assets

```bash
curl --request POST --url 'http://localhost:4000/multi-router/assets' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "value": 100,
  "assetType": "Equipment",
  "purchaseDate": "2026-10-29"
}'
```

## GET /multi-router/assets

```bash
curl --request GET --url 'http://localhost:4000/multi-router/assets' --header 'Authorization: Bearer REPLACE_token'
```

## GET /multi-router/assets/assetType/:assetType

```bash
curl --request GET --url 'http://localhost:4000/multi-router/assets/assetType/Equipment' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /multi-router/assets/:id

```bash
curl --request PATCH --url 'http://localhost:4000/multi-router/assets/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "value": 200
}'
```

## DELETE /multi-router/assets/:id

```bash
curl --request DELETE --url 'http://localhost:4000/multi-router/assets/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /multi-router/expenditures

```bash
curl --request POST --url 'http://localhost:4000/multi-router/expenditures' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "expenditureType": "Fuel",
  "expenditureDate": "2026-10-29",
  "expenditureStatus": 0,
  "value": 100,
  "date": "2026-10-29",
  "remarks": "Postman test"
}'
```

## GET /multi-router/expenditures

```bash
curl --request GET --url 'http://localhost:4000/multi-router/expenditures' --header 'Authorization: Bearer REPLACE_token'
```

## GET /multi-router/expenditures/expenditureType/:expenditureType

```bash
curl --request GET --url 'http://localhost:4000/multi-router/expenditures/expenditureType/Fuel' --header 'Authorization: Bearer REPLACE_token'
```

## POST /multi-router/expenditures/get-date-range

```bash
curl --request POST --url 'http://localhost:4000/multi-router/expenditures/get-date-range' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "startDate": "2026-10-01",
  "endDate": "2026-10-29"
}'
```

## PATCH /multi-router/expenditures/:id

```bash
curl --request PATCH --url 'http://localhost:4000/multi-router/expenditures/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "expenditureType": "Fuel",
  "expenditureDate": "2026-10-29",
  "expenditureStatus": 0,
  "value": 100,
  "date": "2026-10-29",
  "remarks": "Postman test"
}'
```

## DELETE /multi-router/expenditures/:id

```bash
curl --request DELETE --url 'http://localhost:4000/multi-router/expenditures/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /extra-charge

```bash
curl --request POST --url 'http://localhost:4000/extra-charge' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "GST": "0",
  "serviceCharge": 10,
  "loadingCharge": 10,
  "cartageCharge": 10,
  "isActive": true
}'
```

## GET /extra-charge

```bash
curl --request GET --url 'http://localhost:4000/extra-charge' --header 'Authorization: Bearer REPLACE_token'
```

## POST /extra-charge/filter-city-wise

```bash
curl --request POST --url 'http://localhost:4000/extra-charge/filter-city-wise' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada"
}'
```

## DELETE /extra-charge/:id

```bash
curl --request DELETE --url 'http://localhost:4000/extra-charge/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /extra-charge/:id

```bash
curl --request PATCH --url 'http://localhost:4000/extra-charge/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "serviceCharge": 20
}'
```

## POST /parcel-unloading/parcel-filter-Unloading

```bash
curl --request POST --url 'http://localhost:4000/parcel-unloading/parcel-filter-Unloading?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "branch": "REPLACE_pickUpBranch",
  "bookingType": "paid",
  "bookingStatus": 0,
  "vehicalNumber": "TS09AB1234"
}'
```

## GET /parcel-unloading/grnNo/:grnNo

```bash
curl --request GET --url 'http://localhost:4000/parcel-unloading/grnNo/1001' --header 'Authorization: Bearer REPLACE_token'
```

## POST /parcel-unloading

```bash
curl --request POST --url 'http://localhost:4000/parcel-unloading' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "vehicalNumber": "TS09AB1234",
  "branch": "REPLACE_dropBranch",
  "bookingType": "paid",
  "grnNo": [
    1001
  ],
  "lrNumber": [
    "REPLACE_WITH_EXISTING_LR"
  ]
}'
```

## GET /parcel-unloading

```bash
curl --request GET --url 'http://localhost:4000/parcel-unloading' --header 'Authorization: Bearer REPLACE_token'
```

## GET /parcel-unloading/:id

```bash
curl --request GET --url 'http://localhost:4000/parcel-unloading/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## GET /parcel-unloading/voucher/:voucher

```bash
curl --request GET --url 'http://localhost:4000/parcel-unloading/voucher/1001' --header 'Authorization: Bearer REPLACE_token'
```

## POST /parcel-unloading/filter

```bash
curl --request POST --url 'http://localhost:4000/parcel-unloading/filter?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "branch": "REPLACE_pickUpBranch",
  "vehicleNo": "TS09AB1234"
}'
```

## PATCH /parcel-unloading/:id

```bash
curl --request PATCH --url 'http://localhost:4000/parcel-unloading/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "remarks": "Updated unloading"
}'
```

## DELETE /parcel-unloading/:id

```bash
curl --request DELETE --url 'http://localhost:4000/parcel-unloading/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /parcel-unloading/pending-delivery-report

```bash
curl --request POST --url 'http://localhost:4000/parcel-unloading/pending-delivery-report?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "fromBranch": "REPLACE_pickUpBranch",
  "bookingType": "paid"
}'
```

## POST /parcel-unloading/branch-to-branch-unload

```bash
curl --request POST --url 'http://localhost:4000/parcel-unloading/branch-to-branch-unload?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "fromCity": "Hyderabad",
  "toBranch": "REPLACE_dropBranch"
}'
```

## POST /parcel-unloading/branch-to-branch-post

```bash
curl --request POST --url 'http://localhost:4000/parcel-unloading/branch-to-branch-post' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "unloadBranch": "REPLACE_dropBranch",
  "grnNo": [
    1001
  ],
  "lrNumber": [
    "REPLACE_WITH_EXISTING_LR"
  ],
  "remarks": "Postman test"
}'
```

## POST /cfmaster

```bash
curl --request POST --url 'http://localhost:4000/cfmaster' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "gst": "Sample gst",
  "country": "India",
  "state": "Telangana",
  "city": "Hyderabad",
  "code": "Sample code",
  "name": "Sample",
  "email": "sample@example.com",
  "phone": "9000000001",
  "address": "Sample street",
  "isActive": true,
  "isPostPaid": "Sample isPostPaid",
  "isAgent": "Sample isAgent",
  "isAllowNegativeBooking": "Sample isAllowNegativeBooking",
  "PAN": "Sample PAN",
  "accountNo": "Sample accountNo",
  "ifscCode": "Sample ifscCode",
  "tanNo": "Sample tanNo",
  "creditDaysLimit": 0,
  "exDate": "2026-10-29",
  "partyAccountEmail": "Sample partyAccountEmail",
  "transportEmail": "Sample transportEmail",
  "executiveName": "Sample executiveName",
  "senderName": "Test Sender",
  "senderMobile": 9000000001,
  "receiverName": "Test Receiver",
  "receiverMobile": 9000000002
}'
```

## GET /cfmaster

```bash
curl --request GET --url 'http://localhost:4000/cfmaster' --header 'Authorization: Bearer REPLACE_token'
```

## GET /cfmaster/search/:name

```bash
curl --request GET --url 'http://localhost:4000/cfmaster/search/Sample' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /cfmaster/:id

```bash
curl --request PATCH --url 'http://localhost:4000/cfmaster/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Updated Agent"
}'
```

## DELETE /cfmaster/:id

```bash
curl --request DELETE --url 'http://localhost:4000/cfmaster/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## GET /cfmaster/city/:city

```bash
curl --request GET --url 'http://localhost:4000/cfmaster/city/Hyderabad' --header 'Authorization: Bearer REPLACE_token'
```

## POST /cfextra-charge

```bash
curl --request POST --url 'http://localhost:4000/cfextra-charge' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "agentName": "REPLACE_agentName",
  "chargeName": "Sample chargeName",
  "fromCity": "Hyderabad",
  "toCity": "Vijayawada",
  "charge": 10,
  "modeOnPrice": "weight",
  "itemName": "Sample itemName",
  "dispatchType": "Road",
  "isActive": true
}'
```

## GET /cfextra-charge

```bash
curl --request GET --url 'http://localhost:4000/cfextra-charge' --header 'Authorization: Bearer REPLACE_token'
```

## GET /cfextra-charge/:agentName

```bash
curl --request GET --url 'http://localhost:4000/cfextra-charge/REPLACE_agentName' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /cfextra-charge/:id

```bash
curl --request PATCH --url 'http://localhost:4000/cfextra-charge/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "charge": 20
}'
```

## DELETE /cfextra-charge/:id

```bash
curl --request DELETE --url 'http://localhost:4000/cfextra-charge/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /voucher-generate/credit-voucher-generate

```bash
curl --request POST --url 'http://localhost:4000/voucher-generate/credit-voucher-generate?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "senderName": "Test Sender"
}'
```

## POST /voucher-generate

```bash
curl --request POST --url 'http://localhost:4000/voucher-generate' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "grnNo": [
    1001
  ]
}'
```

## GET /voucher-generate

```bash
curl --request GET --url 'http://localhost:4000/voucher-generate' --header 'Authorization: Bearer REPLACE_token'
```

## GET /voucher-generate/:id

```bash
curl --request GET --url 'http://localhost:4000/voucher-generate/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /voucher-generate/:id

```bash
curl --request PATCH --url 'http://localhost:4000/voucher-generate/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "charge": "20"
}'
```

## DELETE /voucher-generate/:id

```bash
curl --request DELETE --url 'http://localhost:4000/voucher-generate/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /voucher-generate/voucher-details

```bash
curl --request POST --url 'http://localhost:4000/voucher-generate/voucher-details?page=1&limit=25' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "senderName": "Test Sender"
}'
```

## POST /voucher-generate/voucher-details-print

```bash
curl --request POST --url 'http://localhost:4000/voucher-generate/voucher-details-print' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "voucherNo": "1001",
  "creditForAgent": "Test Sender"
}'
```

## POST /expensive/expenses

```bash
curl --request POST --url 'http://localhost:4000/expensive/expenses' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "branchId": "REPLACE_branchId",
  "expenseDate": "2026-10-29",
  "expenseType": "Fuel",
  "amount": 100,
  "paidThrough": "cash",
  "invoice": "TEST-INV-001",
  "notes": "Postman test"
}'
```

## GET /expensive/expenses

```bash
curl --request GET --url 'http://localhost:4000/expensive/expenses' --header 'Authorization: Bearer REPLACE_token'
```

## GET /expensive/expenses/:id

```bash
curl --request GET --url 'http://localhost:4000/expensive/expenses/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /expensive/expenses/:id

```bash
curl --request PATCH --url 'http://localhost:4000/expensive/expenses/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "branchId": "REPLACE_branchId",
  "amount": 100
}'
```

## DELETE /expensive/expenses/:id

```bash
curl --request DELETE --url 'http://localhost:4000/expensive/expenses/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /expensive/expense-types

```bash
curl --request POST --url 'http://localhost:4000/expensive/expense-types' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "accountType": "expense",
  "accountName": "Fuel",
  "accountCode": "FUEL",
  "description": "Fuel expense",
  "isActive": true
}'
```

## GET /expensive/expense-types

```bash
curl --request GET --url 'http://localhost:4000/expensive/expense-types' --header 'Authorization: Bearer REPLACE_token'
```

## GET /expensive/expense-types/:id

```bash
curl --request GET --url 'http://localhost:4000/expensive/expense-types/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /expensive/expense-types/:id

```bash
curl --request PATCH --url 'http://localhost:4000/expensive/expense-types/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "accountName": "Fuel"
}'
```

## DELETE /expensive/expense-types/:id

```bash
curl --request DELETE --url 'http://localhost:4000/expensive/expense-types/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /expensive/account-cat

```bash
curl --request POST --url 'http://localhost:4000/expensive/account-cat' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Transport"
}'
```

## GET /expensive/account-cat

```bash
curl --request GET --url 'http://localhost:4000/expensive/account-cat' --header 'Authorization: Bearer REPLACE_token'
```

## GET /expensive/account-cat/:id

```bash
curl --request GET --url 'http://localhost:4000/expensive/account-cat/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /expensive/account-cat/:id

```bash
curl --request PATCH --url 'http://localhost:4000/expensive/account-cat/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Transport"
}'
```

## DELETE /expensive/account-cat/:id

```bash
curl --request DELETE --url 'http://localhost:4000/expensive/account-cat/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /expensive/account-subcat

```bash
curl --request POST --url 'http://localhost:4000/expensive/account-subcat' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "category": "REPLACE_id"
}'
```

## GET /expensive/account-subcat

```bash
curl --request GET --url 'http://localhost:4000/expensive/account-subcat' --header 'Authorization: Bearer REPLACE_token'
```

## GET /expensive/account-subcat/:id

```bash
curl --request GET --url 'http://localhost:4000/expensive/account-subcat/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /expensive/account-subcat/:id

```bash
curl --request PATCH --url 'http://localhost:4000/expensive/account-subcat/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "category": "REPLACE_id"
}'
```

## DELETE /expensive/account-subcat/:id

```bash
curl --request DELETE --url 'http://localhost:4000/expensive/account-subcat/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /expensive/customers

```bash
curl --request POST --url 'http://localhost:4000/expensive/customers' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Test Customer",
  "mobile": 9000000001
}'
```

## GET /expensive/customers

```bash
curl --request GET --url 'http://localhost:4000/expensive/customers' --header 'Authorization: Bearer REPLACE_token'
```

## GET /expensive/customers/:id

```bash
curl --request GET --url 'http://localhost:4000/expensive/customers/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /expensive/customers/:id

```bash
curl --request PATCH --url 'http://localhost:4000/expensive/customers/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Updated Customer"
}'
```

## DELETE /expensive/customers/:id

```bash
curl --request DELETE --url 'http://localhost:4000/expensive/customers/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /bank/create

```bash
curl --request POST --url 'http://localhost:4000/bank/create' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "accountType": "bank",
  "accountName": "Test Account",
  "accountCode": "TEST001",
  "currency": "INR",
  "accountNumber": "1234567890",
  "bankName": "Test Bank",
  "ifsc": "TEST0000001",
  "description": "Postman test",
  "primary": false
}'
```

## GET /bank/get

```bash
curl --request GET --url 'http://localhost:4000/bank/get' --header 'Authorization: Bearer REPLACE_token'
```

## GET /bank/banks/:id

```bash
curl --request GET --url 'http://localhost:4000/bank/banks/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /bank/banks/:id

```bash
curl --request PATCH --url 'http://localhost:4000/bank/banks/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "accountType": "bank",
  "accountName": "Test Account",
  "accountCode": "TEST001",
  "currency": "INR",
  "accountNumber": "1234567890",
  "bankName": "Test Bank",
  "ifsc": "TEST0000001",
  "description": "Postman test",
  "primary": false
}'
```

## DELETE /bank/banks/:id

```bash
curl --request DELETE --url 'http://localhost:4000/bank/banks/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /item/create

```bash
curl --request POST --url 'http://localhost:4000/item/create' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "type": "Goods",
  "name": "Sample",
  "unit": "pcs",
  "salesInfo": {
    "sellingPrice": 100,
    "account": "Sales",
    "description": "Test"
  },
  "purchaseInfo": {
    "costPrice": 80,
    "account": "Purchases",
    "description": "Test",
    "preferredVendor": ""
  }
}'
```

## GET /item/get

```bash
curl --request GET --url 'http://localhost:4000/item/get' --header 'Authorization: Bearer REPLACE_token'
```

## GET /item/items/:id

```bash
curl --request GET --url 'http://localhost:4000/item/items/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /item/items/:id

```bash
curl --request PATCH --url 'http://localhost:4000/item/items/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "type": "Goods",
  "name": "Sample",
  "unit": "pcs",
  "salesInfo": {
    "sellingPrice": 100,
    "account": "Sales",
    "description": "Test"
  },
  "purchaseInfo": {
    "costPrice": 80,
    "account": "Purchases",
    "description": "Test",
    "preferredVendor": ""
  }
}'
```

## DELETE /item/items/:id

```bash
curl --request DELETE --url 'http://localhost:4000/item/items/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## POST /vendor/create

```bash
curl --request POST --url 'http://localhost:4000/vendor/create' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "companyName": "Test Vendor Company",
  "displayName": "Test Vendor",
  "address": "Sample street",
  "workPhone": "9000000001",
  "mobile": "9000000001",
  "bankDetails": {
    "accountNumber": "1234567890",
    "accountName": "Test Vendor",
    "bankName": "Test Bank",
    "branchName": "Main",
    "ifscCode": "TEST0000001"
  }
}'
```

## GET /vendor/get

```bash
curl --request GET --url 'http://localhost:4000/vendor/get' --header 'Authorization: Bearer REPLACE_token'
```

## GET /vendor/:id

```bash
curl --request GET --url 'http://localhost:4000/vendor/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## PATCH /vendor/:id

```bash
curl --request PATCH --url 'http://localhost:4000/vendor/REPLACE_id' --header 'Authorization: Bearer REPLACE_token' --header 'Content-Type: application/json' --data-raw '{
  "name": "Sample",
  "companyName": "Test Vendor Company",
  "displayName": "Test Vendor",
  "address": "Sample street",
  "workPhone": "9000000001",
  "mobile": "9000000001",
  "bankDetails": {
    "accountNumber": "1234567890",
    "accountName": "Test Vendor",
    "bankName": "Test Bank",
    "branchName": "Main",
    "ifscCode": "TEST0000001"
  }
}'
```

## DELETE /vendor/:id

```bash
curl --request DELETE --url 'http://localhost:4000/vendor/REPLACE_id' --header 'Authorization: Bearer REPLACE_token'
```

## GET /branch-report/:branchCode/live-snapshot

```bash
curl --request GET --url 'http://localhost:4000/branch-report/REPLACE_branchCode/live-snapshot' --header 'Authorization: Bearer REPLACE_token'
```

## GET /branch-report/:branchCode/live-status

```bash
curl --request GET --url 'http://localhost:4000/branch-report/REPLACE_branchCode/live-status' --header 'Authorization: Bearer REPLACE_token'
```

## GET /health

```bash
curl --request GET --url 'http://localhost:4000/health'
```

