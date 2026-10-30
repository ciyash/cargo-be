# Interior workspace design

Angular interior routes use a shared CargoNest theme with navy navigation, teal actions, light page backgrounds and consistent form/table surfaces. Authentication and print routes are excluded through AppComponent host classes. Print media hides the navigation.

Sources: crm-frontend/src/styles.scss (shared controls and page surfaces), src/styles/_workspace-navigation.scss (navigation appearance), src/app/USER/header/header.component.html and .ts (accessible dropdown and mobile interactions).

Navigation opens via buttons, supports keyboard Enter/Space and Escape, closes on outside click or route selection, highlights active routes, and collapses below 992px. Company branding, branch context and account details remain connected to the authenticated profile.

Forms preserve their reactive controls and submit handlers. Shared controls, buttons, validation messages, report tables, Select2 inputs, billing cards and dashboard cards use consistent visual treatments. Obsolete percentage spacing for the previous fixed navbar has been removed from screens containing app-header; print templates were excluded from that sweep.

Verification: Angular development build and TypeScript check passed. An isolated headless Edge session with dummy frontend accounts confirmed company navigation visibility at 1440px and 390px, staff navigation visibility, and staff dropdown links. No real account or billing operations were performed.

Company workspace now includes the shared navbar with Overview, Team, Branches, Plan & Billing and Company logo section links. Tablet/mobile navigation stays visible as a horizontal menu and offers an explicit Menu toggle for expansion.

Booking layout correction: the shipment search widget accepts embedded=true so parent pages render exactly one navbar. Its standalone route keeps its own header. Staff billing shows only a small warning near the free limit or when access is blocked; full pricing and payment controls stay in the company workspace. All three booking roles use responsive light charges fields instead of invalid standalone table rows. Company monograms use the same navy/teal palette as navigation. Isolated mocked browser checks covered employee desktop/mobile, admin and subadmin: one header, zero staff pricing cards, seven charges fields, and no horizontal page overflow at 390px.

Compact header revision: desktop uses one navy row (65px measured) for company logo, navigation, branch and account. Sign out is inside the profile dropdown. The old white top bar and workspace caption are removed. Mobile remains 95px with a visible navigation strip and expandable Menu control. Browser checks with isolated mock accounts verified employee/admin menus, profile menu with Sign out, Escape dismissal, mobile expansion, and no horizontal overflow at 390px. Empty shipment search now defaults to an empty string and safely handles blank values. Angular development build passed.

Profile navigation correction: main-menu Profile entries are removed for staff roles, including duplicate entries nested in navigation groups. The account dropdown is the single profile entry point. Admins retain /adminprofile; other staff retain /profile. The avatar, dropdown summary and profile details screen refer to the same signed-in account.
