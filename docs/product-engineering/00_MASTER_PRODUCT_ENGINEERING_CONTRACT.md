# Yenomi ID --- Master Product Engineering Contract

**Document:** `00_MASTER_PRODUCT_ENGINEERING_CONTRACT.md`\
**Baseline:** Yenomi ID v25.8.82 / Guest Checkout package\
**Date:** 15 August 2026\
**Status:** Master working contract\
**Scope:** Product, UX, UI, architecture, commerce, payment,
entitlement, security, accessibility, QA, release and agent behavior

------------------------------------------------------------------------

## 0. PURPOSE

This document is the governing engineering and product-development
contract for Yenomi ID.

Yenomi ID is **not a greenfield project**.

The repository already contains product decisions, domain logic,
database migrations, commerce flows, payment lifecycle logic,
entitlement logic, individual and corporate account surfaces, CSS
architecture contracts, design-system foundations, demo QA scenarios,
static verifiers and release gates.

The agent must therefore behave as a **system evolver**, not as a
greenfield code generator.

The objective is not to produce code quickly.

The objective is to evolve Yenomi ID while preserving:

-   product integrity
-   domain correctness
-   visual consistency
-   design-system integrity
-   architectural boundaries
-   security
-   accessibility
-   responsive quality
-   performance
-   testability
-   maintainability
-   conversion quality
-   production reliability
-   regression safety

------------------------------------------------------------------------

# 1. PRINCIPAL RULE

> **Do not change what you have not inspected. Do not add what already
> exists. Do not hide a root cause with a new override. Do not declare
> completion without verification.**

The mandatory operating sequence is:

``` text
DISCOVER
  ↓
UNDERSTAND
  ↓
MAP IMPACT
  ↓
PLAN
  ↓
IMPLEMENT
  ↓
VERIFY
  ↓
FIX
  ↓
REGRESSION
  ↓
QA
  ↓
DOCUMENT
  ↓
RELEASE
```

A task is not complete because the UI looks correct.

A task is complete only when the relevant product, architecture, domain,
accessibility, responsive, security and QA contracts remain valid.

------------------------------------------------------------------------

# 2. PRODUCT IDENTITY

## 2.1 Brand

**Brand:** Yenomi ID

Do not introduce an alternate working brand.

## 2.2 Product definition

Yenomi ID is a hybrid physical + digital identity product:

-   physical NFC cards
-   QR-enabled sharing
-   managed digital identity/profile
-   public profile
-   activation
-   entitlement lifecycle
-   individual customer account
-   corporate/team management
-   seats/licenses
-   templates
-   employee lifecycle
-   analytics
-   renewal

The core proposition is:

> **Physical card + digital profile + persistent identity system.**

The physical card, digital profile, account and entitlement are distinct
domain concepts.

Never collapse them into one UI concept.

------------------------------------------------------------------------

# 3. CURRENT PRODUCT BASELINE

The v25.8.82 repository is the authoritative implementation baseline
unless a later approved release supersedes it.

Known baseline characteristics:

-   Next.js App Router
-   TypeScript
-   React
-   Supabase
-   iyzico payment integration
-   Zod
-   Vitest
-   Playwright
-   accessibility testing
-   responsive testing
-   static architecture verifiers
-   CSS route ownership contracts
-   design-system foundation
-   commerce/order/payment lifecycle
-   entitlement and activation flows
-   individual account
-   corporate organization
-   demo QA matrix
-   guest checkout contract for physical individual purchases

The current production-facing product language emphasizes:

-   NFC + QR card
-   editable digital profile
-   physical + digital identity
-   loss mode
-   individual and corporate use
-   premium physical product
-   annual digital service/renewal model

Do not casually rewrite this positioning.

------------------------------------------------------------------------

# 4. EXISTING SYSTEM PRESERVATION

## 4.1 Existing behavior is presumed intentional

Before replacing or simplifying an existing implementation, determine:

-   why it exists
-   which routes consume it
-   which components depend on it
-   which API contracts depend on it
-   which database structures depend on it
-   which tests protect it
-   which demo scenarios depend on it
-   whether it is legacy, transitional or canonical

## 4.2 No destructive rewrite

Do not:

-   rewrite working systems merely for stylistic preference
-   replace existing domain models with generic tables
-   replace working payment logic with a mock
-   replace RLS with client checks
-   replace a canonical component with a duplicate
-   remove a migration without proving it is obsolete
-   remove a verifier because it is inconvenient
-   change a test solely to make a failing implementation pass

## 4.3 No opportunistic refactor

Do not expand task scope simply because unrelated code looks old.

Out-of-scope refactoring is allowed only when it is required for:

-   correctness
-   security
-   accessibility
-   the requested feature
-   regression prevention
-   dependency correctness
-   architectural integrity

------------------------------------------------------------------------

# 5. MANDATORY DISCOVERY BEFORE CHANGE

Before modifying code, inspect the relevant repository surface.

At minimum, inspect:

``` text
repository tree
package.json
package-lock.json
next.config
tsconfig
middleware
environment-variable contract
route tree
existing components
design-system components
hooks
server actions
API routes
database migrations
Supabase policies/RLS
payment integration
commerce services
entitlement services
authentication
authorization
CSS architecture
design tokens
tests
fixtures
demo seed/matrix
verification scripts
release configuration
deployment configuration
existing documentation
```

For the affected task, identify:

### Current State

-   affected routes
-   affected components
-   affected APIs
-   affected server actions
-   affected database tables
-   affected migrations
-   affected CSS owners
-   existing tests
-   existing demo scenarios
-   existing business rules
-   current UX behavior
-   known constraints

### Change Surface

-   files that must change
-   files that must not change
-   API changes
-   schema changes
-   migration requirements
-   design-system changes
-   CSS ownership changes
-   regression risks

No implementation should begin before this impact map is understood.

------------------------------------------------------------------------

# 6. DOMAIN MODEL

The canonical conceptual relationship is:

``` text
Customer / User
      ↓
Account
      ↓
Order
      ↓
Order Item
      ↓
Physical Card
      ↓
Entitlement
      ↓
Digital Profile
      ↓
Public Profile
      ↓
NFC / QR
```

Corporate flows add:

``` text
Organization
      ↓
Membership
      ↓
Role / Permission
      ↓
Seat / License
      ↓
Employee
      ↓
Assigned Card
      ↓
Entitlement / Profile
```

Renewal adds:

``` text
Entitlement
      ↓
Renewal
      ↓
New Service Window
```

These are domain relationships, not merely UI relationships.

------------------------------------------------------------------------

# 7. DOMAIN VOCABULARY CONTRACT

Use consistent Turkish UX terminology.

  Domain concept     Preferred UX term
  ------------------ -----------------------
  Physical Card      Fiziksel Kart
  Digital Profile    Dijital Profil
  Public Profile     Paylaşılabilir Profil
  Account            Hesap
  Entitlement        Dijital Hizmet
  Order              Sipariş
  Payment            Ödeme
  Organization       Şirket / Kurum
  Membership         Üyelik
  Employee           Çalışan
  Card Assignment    Kart Ataması
  Lost Mode          Kayıp Modu
  Renewal            Yenileme
  Card collection    Kartlarım
  Selected card      Kartım
  Product identity   Dijital Kimlik

Do not use domain terms randomly.

Specifically:

-   Kart ≠ Profil
-   Kart ≠ Hesap
-   Profil ≠ Entitlement
-   Entitlement ≠ Order
-   Order ≠ Payment
-   Organization ≠ User

Code naming may differ where required by existing contracts, but
user-facing terminology must remain consistent.

------------------------------------------------------------------------

# 8. INFORMATION ARCHITECTURE

## Public

-   `/`
-   `/urunler`
-   `/urunler/nfc-kart`
-   `/kurumsal`
-   `/giris`
-   `/gizlilik`
-   `/iade-iptal`
-   `/mesafeli-satis-sozlesmesi`

## Commerce

-   `/sepet`
-   `/checkout`
-   `/odeme/basarili`
-   `/odeme/basarisiz`
-   `/nfc-siparis`

## Individual

-   `/hesabim`
-   `/siparislerim`
-   `/kartlarim`
-   `/kartim`
-   `/olustur`
-   `/aktivasyon`
-   `/ayarlar`
-   `/istatistikler`

## Corporate

-   `/kurumsal/panel`
-   `/kurumsal/panel/organizasyon`
-   `/kurumsal/panel/calisanlar`
-   `/kurumsal/panel/roller`
-   `/kurumsal/panel/lisans`
-   `/kurumsal/panel/kartlar`
-   `/kurumsal/panel/icerik`
-   `/kurumsal/panel/sablon`
-   `/kurumsal/panel/istatistikler`
-   `/kurumsal/panel/ayarlar`
-   `/kurumsal/davet`

Do not create alternate routes for the same concept without an explicit
architecture decision.

------------------------------------------------------------------------

# 9. DESIGN SYSTEM FIRST

The design system is a product infrastructure layer.

## Foundations

-   color
-   typography
-   spacing
-   radius
-   border
-   shadow
-   motion
-   breakpoint
-   z-index
-   iconography

## Existing canonical primitives

Prefer existing canonical implementations before adding anything new:

-   Button
-   ButtonLink
-   Card
-   Badge
-   PageHeader
-   Field
-   Input
-   Select
-   Textarea
-   Label
-   Checkbox
-   Switch
-   Container
-   Stack
-   Grid
-   Alert
-   Pagination
-   EmptyState

## Expansion candidates

When a pattern genuinely recurs, evaluate whether it belongs in the
design system:

-   IconButton
-   LinkButton
-   PasswordInput
-   Combobox
-   Radio
-   FormSection
-   Toast
-   Tooltip
-   Modal
-   Drawer
-   Dropdown
-   Popover
-   Tabs
-   Breadcrumb
-   ProductCard
-   Price
-   QuantitySelector
-   Skeleton
-   ErrorState
-   SuccessState
-   LoadingState
-   ConfirmDialog
-   DataTable
-   Timeline
-   StatusBadge
-   FileUpload
-   Avatar
-   Stepper

Do not create all of these pre-emptively.

Create a primitive when repeated usage demonstrates that it is a real
product pattern.

Every canonical component must define, where relevant:

-   default
-   hover
-   focus-visible
-   active
-   disabled
-   loading
-   error
-   success
-   responsive
-   keyboard
-   accessibility
-   motion/reduced-motion behavior

------------------------------------------------------------------------

# 10. DESIGN SYSTEM RULE

If the same visual or interaction pattern appears twice:

1.  inspect the design system
2.  reuse an existing primitive if one exists
3.  if no primitive exists, determine whether a new reusable primitive
    is justified
4.  implement it once
5.  migrate the relevant consumers
6.  prevent duplicate implementations

Never create:

-   `ButtonV2`
-   `NewButton`
-   `CardFinal`
-   `DashboardCardNew`
-   `EmptyState2`
-   `HeaderFix`
-   `FinalModal`

or equivalent duplicate naming patterns.

------------------------------------------------------------------------

# 11. CSS ARCHITECTURE CONTRACT

## Absolute rules

-   no new global stylesheet for feature work
-   no new global selectors unless explicitly approved
-   no new `!important`
-   no duplicate selector ownership
-   no specificity wars
-   no inline styles for static design values
-   no hard-coded colors when a design token exists
-   no random spacing values when the token scale can express the
    requirement
-   no component recreated through route-specific CSS if a canonical
    component exists
-   no route CSS imported globally
-   no route CSS imported by unrelated route segments
-   no component CSS owned by unrelated routes

## Inline style

`style={{...}}` is acceptable only when the value is genuinely dynamic
and cannot reasonably be represented by:

-   a class
-   token
-   CSS variable
-   component variant

## Legacy CSS

Legacy CSS must not be expanded.

When touching a legacy selector:

1.  locate all consumers
2.  identify ownership
3.  determine whether it can be migrated
4.  migrate safely
5.  verify regressions
6.  remove obsolete declarations only after proof

Never solve a legacy CSS problem by stacking another override on top.

------------------------------------------------------------------------

# 12. CSS DEBT BUDGET

Track at minimum:

-   total `!important`
-   new `!important`
-   global selectors
-   duplicate selector ownership
-   legacy file usage
-   inline static styles
-   hard-coded colors
-   hard-coded spacing
-   route ownership violations

Required invariant:

``` text
New !important = 0
New global selector = 0
New duplicate owner = 0
Legacy debt must not increase
```

Where practical, each CSS-focused phase must reduce debt.

------------------------------------------------------------------------

# 13. STATE MATRIX

Every critical screen must explicitly handle the relevant states.

  State          UX requirement
  -------------- -------------------------------------
  Loading        Skeleton / deterministic loading UI
  Empty          Canonical EmptyState
  Error          Canonical ErrorState
  Success        Clear success feedback
  Partial        Explain incomplete data
  Offline        Connection-aware behavior
  Unauthorized   Login/authentication path
  Forbidden      Permission-aware message
  Expired        Session/service expiration path
  Processing     Prevent duplicate action
  Disabled       Explain why when useful
  Optimistic     Reconcile with server result

Do not design only the happy path.

------------------------------------------------------------------------

# 14. ORDER STATE MATRIX

Order Detail must support relevant lifecycle states such as:

-   created
-   payment pending
-   paid
-   processing
-   preparing
-   shipped
-   delivered
-   cancelled
-   refund requested
-   refunded
-   partially refunded
-   invalid
-   unauthorized
-   unavailable

Each state must have:

-   correct status label
-   correct visual treatment
-   correct next action
-   correct accessibility announcement where applicable
-   no false promise

------------------------------------------------------------------------

# 15. PAYMENT STATE MACHINE

Payment states are server-authoritative.

Support at minimum:

``` text
created
pending
processing
succeeded
failed
cancelled
expired
refunded
partially_refunded
```

Test:

-   duplicate callback
-   webhook replay
-   timeout
-   provider failure
-   browser refresh
-   payment success + order creation failure
-   order creation success + entitlement creation failure
-   callback arriving twice
-   delayed callback
-   user abandoning checkout
-   payment provider unavailable

Never allow client state to declare a payment successful.

------------------------------------------------------------------------

# 16. PAYMENT / ORDER / FULFILLMENT SEPARATION

These are separate state machines.

``` text
Payment
   ↓
Order
   ↓
Entitlement
   ↓
Fulfillment
```

Payment success does not automatically imply fulfillment success.

The system must be able to represent:

-   payment succeeded
-   order exists
-   fulfillment requires reconciliation
-   entitlement is pending
-   physical fulfillment is delayed

Do not collapse these into one generic `success` state.

------------------------------------------------------------------------

# 17. ENTITLEMENT CONTRACT

Purchasing a card is not merely creating an order.

The conceptual flow is:

``` text
Payment
  ↓
Order
  ↓
Order Item
  ↓
Entitlement
  ↓
Digital Service Access
  ↓
Profile / Card Activation
```

Entitlement must be treated as a domain concern.

Relevant fields/relationships may include:

-   entitlement identity
-   product
-   order
-   profile
-   status
-   starts_at
-   expires_at
-   renewal
-   suspension
-   cancellation
-   grace period
-   claim/activation relationship

Do not put entitlement business rules inside React components.

------------------------------------------------------------------------

# 18. GUEST CHECKOUT CONTRACT

Current product architecture:

### Browsing

No account required.

### Cart

No account required.

### Physical individual checkout

Guest checkout is allowed where the current server contract supports it.

### Digital ownership

Verified account required.

### Corporate seat-pack

Authentication + organization permission required.

Guest post-purchase flow must make the claim/account activation step
explicit.

Never imply guest checkout is available if the runtime implementation
does not support it.

Never implement a fake guest checkout merely to make the UI look
complete.

------------------------------------------------------------------------

# 19. ACCOUNT BOUNDARIES

A user account owns or accesses:

-   digital profile
-   card identity
-   orders
-   order history
-   addresses
-   payment references
-   entitlement state
-   support
-   security settings

Digital identity management requires authenticated ownership.

A guest order may exist before account activation, but ownership
transfer must be server-authorized and auditable.

------------------------------------------------------------------------

# 20. CORPORATE ARCHITECTURE

Product-facing roles:

-   Owner
-   Admin
-   Member
-   Viewer

The repository may contain additional operational roles required by
existing enterprise workflows.

Do not delete or collapse existing internal roles simply because the
product-facing model is simpler.

## Permission matrix

At minimum define explicit permissions for:

-   organization settings
-   billing
-   member invitation
-   member removal
-   role management
-   order viewing
-   card management
-   content/profile management
-   analytics
-   templates
-   seat/license management

Permissions must be enforced server-side.

UI hiding is not authorization.

------------------------------------------------------------------------

# 21. SECURITY CONTRACT

Security boundaries:

``` text
UI
 ↓
Server/API/domain authorization
 ↓
Database/RLS
```

The UI is never the final security boundary.

Protect against:

-   IDOR
-   privilege escalation
-   organization data leakage
-   unauthorized card access
-   unauthorized entitlement claim
-   replayed activation
-   replayed invitation
-   webhook replay
-   payment callback forgery
-   XSS
-   unsafe input
-   malformed payloads
-   session misuse
-   rate-limit bypass

Use:

-   server-side validation
-   Zod/domain validation
-   RLS
-   authorization checks
-   secure session handling
-   webhook verification
-   idempotency
-   rate limiting where appropriate
-   audit logging

Never log:

-   raw payment card data
-   secrets
-   passwords
-   unnecessary PII

------------------------------------------------------------------------

# 22. DEMO QA CONTRACT

The repository's demo-user matrix is a QA asset and must be treated as a
source of truth. The canonical registry is
`tests/fixtures/demo-user-matrix.ts`.

Do not invent random demo users for every task.

Examples include:

-   `qa26.superadmin@yenomi.test`
-   `qa26.card.pending@yenomi.test`
-   `qa26.card.complete@yenomi.test`
-   `qa26.bireysel.bos@yenomi.test`
-   `qa26.bireysel.aktif@yenomi.test`
-   corporate owner/admin/member scenarios
-   invitation pending/expired/revoked scenarios
-   card lifecycle scenarios
-   lost/replacement scenarios
-   multi-organization scenarios
-   capacity scenarios

Before adding a demo scenario:

1.  inspect the existing demo registry
2.  determine whether an existing scenario already represents the state
3.  reuse it if possible
4.  add only if a genuinely new state is required

Production must never expose demo users or demo seed data.

------------------------------------------------------------------------

# 23. TESTING CONTRACT

Testing has multiple layers.

## Static

-   TypeScript
-   ESLint where configured
-   import validation
-   route validation
-   CSS architecture
-   route CSS ownership
-   migration drift
-   package alignment
-   contract verifiers
-   secret checks

## Unit

-   domain logic
-   pricing
-   totals
-   discounts
-   validation
-   entitlement
-   permissions
-   payment state
-   lifecycle transitions
-   serialization

## Integration

-   auth
-   cart
-   checkout
-   payment
-   order
-   entitlement
-   claim
-   organization
-   invitation
-   card lifecycle

## E2E

At minimum relevant journeys include:

-   anonymous browsing
-   product selection
-   cart
-   guest physical purchase
-   authenticated purchase
-   payment success
-   payment failure
-   order tracking
-   claim/activation
-   profile creation
-   profile publishing
-   card loss mode
-   replacement
-   organization invitation
-   employee onboarding
-   employee offboarding
-   permission boundaries

## Visual

Check:

-   desktop
-   tablet
-   mobile
-   loading
-   empty
-   error
-   success
-   critical commerce states
-   dashboard states
-   public profile
-   checkout

## Accessibility

Check:

-   keyboard navigation
-   focus-visible
-   focus order
-   semantic HTML
-   labels
-   form errors
-   accessible names
-   contrast
-   screen-reader semantics
-   reduced motion
-   axe where configured

------------------------------------------------------------------------

# 24. TEST EXECUTION RULE

The agent must run the tests itself whenever the environment allows it.

Do not default to telling the user:

> "Run this command."

Instead:

1.  run the relevant test
2.  inspect failure
3.  identify root cause
4.  fix
5.  rerun
6.  run relevant regression
7.  report result

Only request user intervention when the action genuinely requires access
the agent does not have, such as:

-   production credentials
-   external provider confirmation
-   physical device testing
-   unavailable private service
-   deployment approval

------------------------------------------------------------------------

# 25. TEST FAILURE PROTOCOL

When a test fails:

``` text
FAIL
 ↓
READ FULL ERROR
 ↓
CLASSIFY
 ├─ implementation
 ├─ test
 ├─ environment
 ├─ dependency
 ├─ data/fixture
 ├─ migration
 └─ infrastructure
 ↓
ROOT CAUSE
 ↓
MINIMAL FIX
 ↓
TARGETED TEST
 ↓
REGRESSION
```

Never repeatedly ask the user to run the same failing command.

Do not modify tests merely to hide an implementation defect.

If the environment itself is the blocker, clearly distinguish:

-   implementation failure
-   test failure
-   environment blocker

------------------------------------------------------------------------

# 26. RESPONSIVE CONTRACT

Breakpoints are not merely resize targets.

Use the existing project breakpoint system, including:

-   480
-   768
-   1024
-   1280

But define component behavior, not only dimensions.

Review specifically:

-   navigation
-   product grid
-   product gallery
-   filter drawer
-   checkout summary
-   forms
-   dashboard sidebar
-   tables
-   modal
-   drawer
-   cards
-   profile preview
-   public profile
-   corporate dashboard

Mobile must not be a shrunken desktop.

Mobile interaction patterns may require a different information
hierarchy and interaction model.

------------------------------------------------------------------------

# 27. ACCESSIBILITY CONTRACT

Accessibility is part of correctness.

Requirements:

-   semantic HTML
-   keyboard support
-   visible focus
-   accessible names
-   correct labels
-   correct error association
-   status announcements where appropriate
-   sufficient contrast
-   reduced motion support
-   touch target quality
-   no keyboard traps
-   dialogs with correct focus management
-   tables with proper semantics
-   forms with useful validation feedback

Do not use color as the only state indicator.

------------------------------------------------------------------------

# 28. UX WRITING CONTRACT

User-facing copy must be:

-   Turkish-first
-   concise
-   clear
-   reassuring
-   action-oriented
-   consistent with domain vocabulary

Technical implementation errors must never be exposed directly.

Bad:

``` text
SUPABASE_AUTH_ERROR
```

Better:

``` text
Giriş yapılamadı. E-posta adresinizi ve şifrenizi kontrol edip tekrar deneyin.
```

Maintain consistent vocabulary for:

-   CTA
-   payment
-   order status
-   validation
-   destructive actions
-   confirmation
-   empty states
-   account activation
-   renewal
-   lost card
-   organization actions

Never invent fake business claims.

------------------------------------------------------------------------

# 29. NO FAKE FUNCTIONALITY

Do not create fake:

-   payment success
-   shipment tracking
-   invoice
-   analytics
-   user data
-   order data
-   API response
-   entitlement
-   fulfillment
-   card activation

If the backend is not available:

-   define an explicit mock boundary
-   label it as mock/test-only
-   keep the production path real
-   do not present test data as production truth

------------------------------------------------------------------------

# 30. SEO CONTRACT

Public, indexable surfaces must consider:

-   metadata
-   title
-   description
-   canonical
-   Open Graph
-   social cards
-   sitemap
-   robots
-   semantic HTML
-   structured data

Relevant structured data may include:

-   Product
-   Organization
-   Breadcrumb
-   FAQ

Only generate schema from real page content.

Never create fake reviews, prices, availability or claims in structured
data.

------------------------------------------------------------------------

# 31. PERFORMANCE CONTRACT

Avoid unnecessary:

-   client components
-   hydration
-   duplicated data fetching
-   large client bundles
-   blocking scripts
-   unoptimized images
-   repeated server calls
-   expensive rerenders

Prefer:

-   Server Components
-   server-side data fetching where appropriate
-   streaming/loading boundaries
-   optimized images
-   minimal client state
-   stable component boundaries

Do not convert an RSC surface to a client component merely for
convenience.

------------------------------------------------------------------------

# 32. OBSERVABILITY CONTRACT

Production observability should cover:

-   application errors
-   authentication events
-   payment events
-   order lifecycle
-   entitlement lifecycle
-   organization events
-   invitation events
-   card lifecycle
-   security-relevant events

Audit events must avoid unnecessary PII and never contain payment
secrets.

------------------------------------------------------------------------

# 33. DATABASE CONTRACT

Before adding a table:

1.  inspect existing tables
2.  inspect migrations
3.  inspect existing relationships
4.  inspect RLS
5.  inspect existing service/repository layer
6.  determine whether the concept already exists

Do not create generic duplicate tables merely because a UI concept has a
different name.

Database changes require:

-   migration
-   RLS consideration
-   rollback/recovery consideration
-   fixture/demo impact analysis
-   migration-drift verification
-   relevant tests

------------------------------------------------------------------------

# 34. API CONTRACT

Every server/API boundary must define:

-   authentication requirement
-   authorization requirement
-   input schema
-   output contract
-   error contract
-   idempotency where needed
-   rate limiting where needed
-   logging/audit implications

Never trust client-submitted:

-   price
-   total
-   discount
-   stock
-   entitlement
-   permission
-   organization ID
-   payment success
-   order ownership

------------------------------------------------------------------------

# 35. DESIGN QA CONTRACT

Before declaring a UI task complete, verify:

### Visual

-   spacing
-   typography
-   hierarchy
-   alignment
-   component consistency
-   states
-   responsive behavior
-   visual density
-   premium brand language

### Interaction

-   hover
-   focus
-   active
-   disabled
-   loading
-   error
-   success
-   keyboard
-   mobile interaction

### Content

-   labels
-   CTA consistency
-   empty-state copy
-   error copy
-   pricing language
-   terminology

### Conversion

For public commerce:

-   value proposition
-   price clarity
-   trust signals
-   product differentiation
-   CTA hierarchy
-   checkout friction
-   mobile conversion

------------------------------------------------------------------------

# 36. PRODUCT CONVERSION PRINCIPLES

Public commerce should communicate:

1.  What is it?
2.  Why does it matter?
3.  What do I receive?
4.  How does it work?
5.  What does it cost?
6.  What happens after purchase?
7.  Is renewal clear?
8.  Can I trust the company?
9.  What happens if the card is lost?
10. Can I use it individually or corporately?

Do not increase conversion by hiding material terms.

Do not use misleading urgency.

Do not use fake social proof.

Do not hide renewal conditions.

------------------------------------------------------------------------

# 37. RELEASE DISCIPLINE

Every phase follows:

``` text
ANALYZE
 ↓
PLAN
 ↓
IMPLEMENT
 ↓
TEST
 ↓
FIX
 ↓
REGRESSION
 ↓
QA
 ↓
CHANGELOG
 ↓
NEXT PHASE
```

If a critical regression exists:

> **Do not proceed to the next phase.**

------------------------------------------------------------------------

# 38. DEFINITION OF DONE --- TASK

A task is complete only when applicable checks pass:

-   [ ] Implementation complete
-   [ ] Architecture checked
-   [ ] Existing behavior preserved
-   [ ] Domain rules preserved
-   [ ] TypeScript passes
-   [ ] Relevant unit tests pass
-   [ ] Relevant integration tests pass
-   [ ] Relevant E2E tests pass
-   [ ] Accessibility checked
-   [ ] Responsive behavior checked
-   [ ] Visual behavior checked
-   [ ] Loading state handled
-   [ ] Empty state handled
-   [ ] Error state handled
-   [ ] Success state handled
-   [ ] Authorization checked
-   [ ] No new `!important`
-   [ ] No unnecessary global CSS
-   [ ] No duplicate component
-   [ ] No fake functionality
-   [ ] Relevant demo scenarios verified
-   [ ] Regression suite checked
-   [ ] Changelog updated
-   [ ] QA report updated
-   [ ] Risks documented

------------------------------------------------------------------------

# 39. DEFINITION OF DONE --- RELEASE

A release requires, as applicable:

-   [ ] static contracts pass
-   [ ] TypeScript passes
-   [ ] unit tests pass
-   [ ] build passes
-   [ ] relevant E2E passes
-   [ ] visual checks pass
-   [ ] accessibility checks pass
-   [ ] migration drift check passes
-   [ ] security checks pass
-   [ ] production demo-data check passes
-   [ ] package/version alignment passes
-   [ ] release artifact verified
-   [ ] staging smoke passes
-   [ ] production smoke passes
-   [ ] release manifest updated
-   [ ] changelog updated
-   [ ] known risks documented

------------------------------------------------------------------------

# 40. RELEASE STATUS MODEL

Do not use a single binary "passed" label.

Use:

### PASS

All required checks completed successfully.

### BLOCKED

A required verification could not run because of
environment/infrastructure/dependency limitations.

### FAIL

A verification ran and identified an actual defect.

### NOT RUN

The check has not yet been executed.

### CONDITIONAL

The check passed under a stated limitation or scope.

Never report BLOCKED as PASS.

Never report NOT RUN as PASS.

------------------------------------------------------------------------

# 41. CURRENT V25.8.82 BASELINE STATUS

The current baseline contains strong static contracts for:

-   product variant UX
-   guest checkout
-   payment lifecycle
-   package alignment
-   CSS architecture
-   accessibility/responsive contracts

However, runtime verification must be treated separately.

At the time of the v25.8.82 QA report:

-   TypeScript runtime verification was blocked by missing dependency
    type/runtime installation in the environment.
-   Vitest runtime was blocked because project-local dependencies were
    unavailable.
-   Next build and Playwright were therefore not allowed to be
    represented as PASS.

This distinction must remain explicit.

------------------------------------------------------------------------

# 42. AGENT WORKING CONTRACT

The agent MUST:

1.  inspect the repository before changing it
2.  inspect affected files before modifying them
3.  inspect imports and dependency chains
4.  inspect existing tests
5.  inspect existing domain rules
6.  inspect existing CSS ownership
7.  inspect existing design-system primitives
8.  inspect existing demo scenarios
9.  identify risks before implementation
10. avoid unnecessary refactors
11. fix root causes
12. use design-system primitives
13. keep business rules outside UI components
14. keep server authority for sensitive state
15. enforce permissions server-side
16. design critical states
17. run tests itself
18. diagnose failures itself
19. fix failures itself where possible
20. rerun the failing test
21. run relevant regression tests
22. update documentation
23. update changelog/QA artifacts when required
24. stop on critical regression
25. request user intervention only when necessary

The agent MUST NOT:

1.  code before inspection
2.  create duplicate components
3.  create duplicate tables
4.  add global CSS casually
5.  add `!important`
6.  hide root causes with overrides
7.  trust client-side pricing
8.  trust client-side authorization
9.  fake successful backend operations
10. weaken tests to make them pass
11. delete existing contracts without replacement
12. silently change product terminology
13. silently change payment semantics
14. silently change entitlement semantics
15. silently change organization permissions
16. expose demo users in production
17. proceed past a critical regression

------------------------------------------------------------------------

# 43. CHANGE REPORT FORMAT

For each meaningful task, report:

``` text
TASK
<what was requested>

DISCOVERY
<what was found>

ROOT CAUSE
<if fixing an existing issue>

CHANGES
<files/components/domain areas changed>

DESIGN
<UX/UI decisions>

ARCHITECTURE
<architecture decisions>

TESTS
<tests executed and results>

REGRESSION
<regression coverage>

RISKS
<remaining risks or blockers>

STATUS
PASS / BLOCKED / FAIL / CONDITIONAL
```

Do not produce a long narrative when a structured result is clearer.

------------------------------------------------------------------------

# 44. PHASE CONTRACT

Every phase must define:

## Objective

What product or engineering outcome is being achieved?

## Scope

What is explicitly included?

## Non-goals

What must not be changed?

## Current state

What already exists?

## Risks

What can break?

## Implementation

What changes?

## Verification

Which tests and contracts prove correctness?

## Regression

Which existing journeys must remain intact?

## Exit criteria

What must be true before the phase is complete?

------------------------------------------------------------------------

# 45. PRIORITY ORDER

When requirements conflict, prioritize:

1.  Security
2.  Data integrity
3.  Domain correctness
4.  Existing production behavior
5.  Accessibility
6.  Design-system integrity
7.  Responsive quality
8.  Conversion
9.  Performance
10. Visual polish

Never sacrifice security or data integrity for visual polish.

Never sacrifice domain correctness to simplify UI code.

Never sacrifice accessibility for pixel-level visual matching.

------------------------------------------------------------------------

# 46. DECISION RULE FOR AMBIGUITY

When requirements are ambiguous:

1.  inspect existing product decisions
2.  inspect current implementation
3.  inspect existing tests
4.  inspect live product behavior when relevant
5.  choose the least destructive interpretation
6.  document the decision
7.  only ask the user when the ambiguity materially changes product
    behavior, security, data, or scope

Do not ask for confirmation for trivial implementation details that can
be resolved safely.

------------------------------------------------------------------------

# 47. LIVE PRODUCT CHECK

When a task affects production-facing UX, verify the current live
behavior when possible.

Compare:

``` text
Repository
   ↓
Local behavior
   ↓
Deployed behavior
```

Do not assume the latest repository state is already live.

Do not assume live behavior represents the latest repository state.

Deployment correctness is part of release correctness.

------------------------------------------------------------------------

# 48. MASTER DESIGN PRINCIPLE

Yenomi ID should feel like one coherent product across:

``` text
Landing
 ↓
Product
 ↓
Cart
 ↓
Checkout
 ↓
Payment
 ↓
Order
 ↓
Activation
 ↓
Profile
 ↓
Card
 ↓
Account
 ↓
Corporate
```

The user must not feel that different routes were designed by different
products.

Consistency must exist at:

-   terminology
-   layout
-   spacing
-   typography
-   components
-   interaction
-   states
-   navigation
-   error handling
-   responsive behavior
-   accessibility
-   business rules

------------------------------------------------------------------------

# 49. FINAL OPERATING PRINCIPLE

> **Yenomi ID is a production product system, not a collection of
> pages.**

Every change must therefore answer:

-   What existing system does this touch?
-   What domain rule does this represent?
-   What user problem does it solve?
-   Which design-system primitive owns the interaction?
-   Which server boundary owns the business rule?
-   Which database/RLS boundary protects the data?
-   Which states must be represented?
-   Which tests prove it?
-   Which existing journeys could regress?
-   How will we know production is still correct?

If these questions cannot be answered, implementation is not ready to
begin.

------------------------------------------------------------------------

# 50. MASTER AGENT LOOP

``` text
READ CONTRACT
    ↓
INSPECT REPOSITORY
    ↓
MAP CURRENT STATE
    ↓
IDENTIFY ROOT CAUSE
    ↓
DEFINE CHANGE SURFACE
    ↓
CHECK DESIGN SYSTEM
    ↓
CHECK DOMAIN / SERVER AUTHORITY
    ↓
IMPLEMENT MINIMAL SAFE CHANGE
    ↓
RUN TARGETED TESTS
    ↓
FIX FAILURES
    ↓
RUN REGRESSION
    ↓
RUN ACCESSIBILITY / RESPONSIVE / VISUAL CHECKS
    ↓
VERIFY CSS / ARCHITECTURE CONTRACTS
    ↓
UPDATE CHANGELOG / QA
    ↓
ASSESS RELEASE RISK
    ↓
ONLY THEN DECLARE DONE
```

**This loop is mandatory for Yenomi ID development.**
