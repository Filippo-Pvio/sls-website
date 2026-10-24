# Separate owner inquiry on property pages

The normal property inquiry keeps its existing buyer note and listed property.
Selecting the additional owner checkbox requires the own property address and type;
apartments additionally require the unit/location. The old owner note on the buyer
property is no longer created. The resolved contact and server-verified listing
origin are sent to the dedicated Azure website owner intake.

The separate importer creates a private owner property and links its owner deal
and one Telesales valuation task. Website-only decisions preserve the shared
contact and buyer object. Existing PriceHubble integration is not changed.
Repeated requests reuse the durable contact/address receipt and never reopen a
closed deal. Existing address matches and uncertain writes need manual review.

## Server configuration

Production requires OWNER_SERVICE_ENABLED=true, OWNER_SERVICE_URL pointing to the
fixed /api/website-owner/intake route, and OWNER_SERVICE_KEY stored as a server-only
Secret. The key must be scoped to website_owner_intake, never a host or CRM key.
Without configuration, owner-selected inquiries stop before buyer CRM writes;
buyer-only requests continue through their existing path.

The Azure WEBSITE_OWNER_IMPORT_ENABLED switch and its audited safe-task config
are independent of PRICEHUBBLE_IMPORT_ENABLED. The synthetic-only contact allowlist
must be removed only for release. Disabling the website owner service requires
hiding/turning off the extra checkbox in the website as well; the buyer-only
path must remain available. Roll back the website to its previous deployment
before disabling the backend during a full rollback.

## Origin and review

The origin channel website_owner_checkbox, first buyer object, reference and
canonical property URL are stored in the SQL receipt, deal note and task. The
original contact source is preserved. This is independent lead attribution, not
a new PropStack source dropdown or campaign tracking feature.

The website distinguishes accepted owner receipts from confirmed CRM creation.
Partial owner failures leave the successful buyer inquiry intact and display a
review message with no resubmission instruction. SQL review receipts must be
checked by the website/CRM administrator; the importer does not retry uncertain
writes. A service failure before receipt acceptance must be investigated from
the website operational event and the buyer contact inquiry; no own object is
then guaranteed. No automatic migration of historic wrongly linked deals occurs.

## Validation

The real Azure intake, SQL timer, owner CRM relation/task, replay after closing,
source attribution and preservation of the synthetic buyer object/contact were
verified before website rollout. Website handler tests cover ordinary buyer
requests, owner address validation, identity/origin tampering, partial failures
and no legacy owner note. Local browser tests use synthetic in-memory CRM data;
they do not claim delivery from the public website.
