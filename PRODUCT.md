# Zitron

Arabic-first, right-to-left skincare ecommerce. Customers browse by product
category, skin type, concern or range, compare product information, and place
cash-on-delivery orders. Customers manage their profiles, addresses and order
history; authenticated staff manage the catalog and fulfilment.

## Clinical UI restructure

The approved direction is a restrained clinical retail interface, not a claim
that Zitron is a clinic or an accredited laboratory. A shopper using a phone in
daylight should immediately find search, relevant products, prices and a clear
next action.

### Visual system

- Keep the existing Cairo font, Arabic RTL layout and blue brand identity.
- Use white and lightly blue-tinted surfaces, dark blue ink and a restrained
  teal action/selection accent. No gold, decorative gradients or glass panels.
- Use shared semantic tokens in `src/app/globals.css`.
- Keep cards and controls within an 8-16px radius. Prefer separators and
  whitespace to nested cards, wide shadows and oversized promotion panels.
- Body and placeholder text must meet 4.5:1 contrast; controls have visible
  focus, disabled, loading, error and selected states.
- Use short state transitions, respect reduced motion, and keep content
  visible without entrance animations.

### Implementation order

1. Establish theme tokens, common control treatments and accessible foundations.
2. Restructure navigation and homepage. Make search prominent, preserve every
   shopping route, and retain database-configured image/video hero content
   with explicit controls rather than distracting automatic movement.
3. Simplify catalog filters and offers. Use consistent product presentation,
   real packshots, readable prices and explicit add-to-cart actions.
4. Organize product detail around identity, size, price, purchase controls,
   description, usage and ingredients. Preserve canonical and legacy routing.
5. Unify cart, checkout, account, order tracking and admin. Retain all existing
   data operations, offer/gift behavior, shipping rules and role boundaries.
6. Inspect desktop, tablet and mobile screenshots and exercise the affected
   workflows before preview and production release.

### Invariants

- Preserve the authenticated Cloudflare Pages Functions/D1 backend and Firebase
  customer authentication. No client-defined staff authority.
- Keep `/product?id=...` canonical and preserve the legacy product rewrites.
- Keep authoritative order totals, capability-based guest tracking, subscription
  refresh behavior and the enforced order lifecycle.
- Keep hero management, uploads, offers, combo selection, newsletter and contact
  persistence, worker management, order printing and customer account features.
- Preserve and clearly identify demonstration data. Never fabricate reviews,
  endorsements, clinical outcomes or press coverage.
- Remove unsupported medical/press claims instead of replacing them with new
  trust badges or implied accreditation.
- The mobile application and push notifications are separate proposed work,
  not features added or advertised as completed by this UI restructure.

## Register

Product. Design serves shopping and store operations: consistent familiar
controls, legible information, progressive disclosure and dependable feedback.
