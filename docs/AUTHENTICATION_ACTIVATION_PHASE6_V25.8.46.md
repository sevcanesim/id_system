# Yenomi ID — Phase 6 Authentication & Activation

## Scope

Phase 6 migrates the authentication transition layer without rewriting Supabase Auth, authorization, organization membership, commerce claim, or middleware security behavior.

Surfaces covered:

- `/giris`
- `/hesabim`
- legacy `/aktivasyon`
- checkout → auth → checkout continuity
- password reset/recovery within `/giris`

## Product decisions

### One auth foundation, two contexts

Bireysel and Kurumsal / İK remain explicit contexts, but they use one authentication page and the same Supabase Auth foundation. Corporate self-signup is intentionally not introduced; organization access continues to originate from the existing organization/invitation model.

### Role-aware default destination

The neutral default destination is `/hesabim`. That route remains the single account decision point: users with a manageable organization are sent to `/kurumsal/panel`; others continue to `/kartlarim`. Explicit `next` destinations (for example checkout) are preserved.

### Purchase continuity

When checkout redirects an unauthenticated visitor to `/giris?next=/checkout`, signup email verification now receives an explicit `emailRedirectTo` that preserves both `portal` and `next`. After sign-in, checkout already reuses the authenticated email in the buyer form.

### Progressive profiling

Signup asks only for email and password. Profile/company/contact content stays outside authentication and is completed later in the product experience.

### Password lifecycle

Password reset and recovery are now available within the same auth surface:

1. user requests a reset with `resetPasswordForEmail`,
2. callback returns to `/giris?mode=recovery`,
3. `PASSWORD_RECOVERY` switches the page into recovery state,
4. the new password is validated with the existing password policy,
5. `updateUser({ password })` completes recovery.

## UI changes

- Removed runtime QR generation from the login route.
- Removed the marketing-heavy stats strip.
- Left side now explains only physical card → phone → digital profile.
- Right side is form-first.
- Canonical semantic tokens only in `auth-flow.css`.
- No gradient or glass blur in authentication chrome.
- Compact legal footer replaces the full marketing footer.
- Mobile layouts are defined at 980px and 640px.
- Focus-visible and reduced-motion support included.

## Business logic intentionally retained

- Supabase password/OAuth authentication
- `user_accounts` account type portal validation
- cart ownership claim after authentication
- middleware auth cookie bridge
- `/api/organizations/mine?management=true` role-aware routing
- `/api/commerce/activate`
- `/api/commerce/claim`
- activation resend API
- checkout login requirement and payment APIs
