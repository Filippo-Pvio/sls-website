# Käuferfinder — persönlicher Nachfragecheck

Route: /kaeuferfinder/. Entry in Verkaufen menu/footer and one entry on selling page. Shared hero crossfade, existing fonts/colors, native accessible form controls, three steps; no fake buyer counts or automatic matching.

## Propstack activation

Create exactly one **note** activity type:

`Website | Käuferfinder | Eigentümeranfrage`

Callback additionally uses the existing note activity type:

`Website Kontakt – Rückruf gewünscht`

Automations and assignment are configured by SLS in Propstack. The website creates these notes on the verified contact, including property type, place, area, rooms, optional price, message, contact channel, optional callback window and privacy confirmation. It does not create a property, deal or actual callback task; SLS's note-based automation does that. No existing contact identity or consent is overwritten.

The online submit becomes available only when the contact API confirms the exact note type (and callback type if requested). If missing, form steps remain usable but online submission is disabled with direct business contact information. No live sample contact or note was created for verification.

## Matching

No live search-profile match has been implemented or promised. Personal review is the first release. Future matching requires verified active search profile coverage, freshness, region/budget/type normalization and appropriate API access. All Propstack credentials remain server-side via existing contact endpoint.

## Validation

Existing contact integration regression checks plus buyer finder structured note/callback and missing-category/invalid-property checks. No live CRM writes or messages for tests.
