# Yenomi-to-Yenomi Instant Connect

## Objective

Turn the public-card **Bağlantı Kur** surface into a three-tier workflow:

1. A signed-in Yenomi ID user shares an eligible profile in one confirmed tap.
2. A person can scan a live Yenomi ID QR code to exchange both public cards.
3. A non-member can still leave contact information through the existing lead form.

## Architecture

- GET /api/networking/instant-connect returns only the signed-in visitor's
  first active, published and email-complete profile. It does not expose email
  or other contact data to the browser.
- POST /api/networking/instant-connect has two explicit paths:
  - ACCOUNT validates the bearer session and profile ownership.
  - QR resolves only an opaque public profile ID extracted from a Yenomi QR
    link. It never accepts person or contact data from the browser.
- create_yenomi_handshake is a service-role-only, transactional PostgreSQL
  function. It validates the two profiles, creates one canonical handshake
  pair, then creates two reciprocal lead records and events.
- The canonical pair has a database unique constraint. Repeating the same
  scan returns an existing connection instead of creating duplicate leads.
- Each resulting lead contains counterpart_profile_id, allowing the
  individual and organization networking inboxes to open the exchanged
  digital card.

## QR scanner behavior

The camera dialog uses getUserMedia plus the browser's native BarcodeDetector
when available. If a browser cannot decode QR frames or camera permission is
declined, the user can paste the Yenomi QR URL instead. The server still
verifies the opaque ID and both profile states before any handshake is stored.

## Guardrails

- Both cards must be published, active, within their service window and have
  an email address, since the existing lead model requires one.
- A user cannot connect a profile to itself or another profile belonging to
  the same account.
- Event attribution is accepted only when the event link belongs to the
  public card being viewed.
- Public write attempts are IP rate limited; authenticated one-tap sharing
  additionally requires a valid bearer session and profile ownership check.
- QR exchange treats a displayed public Yenomi QR code as an explicit sharing
  signal, matching the existing public-card and lead-capture model.

## Verification

- npm run verify:instant-connect
- npm run test:unit -- lib/networking/instant-connect.test.ts
- npm run typecheck
- npm run verify:ui-system
