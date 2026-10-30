# Company initials logo

Common company and staff login pages remain /clogin and /login with CargoNest branding. Registration redirects to /clogin?registered=1. No company-specific login links are generated or shared; logout returns to the common login for the account type.

Registration accepts optional logoText containing exactly two English letters. Blank means use company-name initials: ABC Logistics -> AL, Acme -> AC. The initials are deterministic so the brand does not change between visits. Custom letters are displayed uppercase. Existing longer logo text falls back to company-name initials.

A shared Angular CompanyLogoComponent renders the two-letter monogram and company name. The compact version appears in the staff navbar after authenticated profile data loads. Company workspace displays the logo in its header and offers a two-letter logo editor with preview. Image upload is not part of this frontend flow.

GET /company/branding requires company authentication and derives the company from the token. It returns only companyId, name and derived logoText. The old public /company/branding/:companyId route has been removed. Company/staff profile data supplies the navbar brand. Optional legacy companyId checks remain on backend login requests for compatibility, but the frontend no longer supplies or uses company-specific login context.
