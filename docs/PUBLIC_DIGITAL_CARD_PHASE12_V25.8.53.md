# Yenomi ID — Phase 12 Public Digital Card

## Product decision
The external profile is a digital business card, not a portfolio or mini website. The public surface now prioritizes identity, direct contact, save-contact, company identity and a limited set of useful links.

## Public hierarchy
1. Brand / managed organization indicator
2. Photo, name, title, company
3. Primary “Rehbere Kaydet” action
4. Thumb-friendly quick actions
5. Contact details
6. Social links
7. Managed corporate/personal links
8. Minimal Yenomi footer

## Template behavior
Corporate ESSENTIAL / PROFESSIONAL / EXECUTIVE compositions remain available in editor and admin previews. They no longer make the public profile behave like a marketing microsite. Public corporate profiles use the same fast card architecture with controlled organization branding.

## Mobile-first behavior
The public card becomes edge-to-edge below 520px and uses a two-column quick-action fallback below 390px. Contact actions keep practical touch targets.

## Business logic preserved
Public ID, physical-card ownership, lost/suspended states, service validity, organization branding, managed links, public-profile protection and card-view logging are preserved.

## Functional repair
`/c/[cardCode]` previously produced a save-contact link at `/c/[cardCode]/vcard` without a matching route. Phase 12 adds that route and validates physical-card state, publication state, profile state and service validity before returning the vCard.

## Analytics boundary
No QR/NFC/contact-save/link-click events were fabricated. Existing card-view logging remains unchanged; richer interaction analytics requires a dedicated event model/API phase.
