# Security Notes

## Attack surface

The production app is static HTML/CSS/JavaScript plus one read-only PHP timestamp endpoint. The endpoint accepts no application input, performs no filesystem or database access, sets no cookies, and returns only the server's current Unix timestamp.

## Controls included

- Content Security Policy restricted to same-origin scripts, styles, images, and connections
- `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, and `frame-ancestors 'none'` at the HTTP-header layer
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- Restrictive Permissions Policy
- Directory indexing disabled in `.htaccess`
- Time endpoint explicitly marked `no-store` / `no-cache`
- No third-party scripts, fonts, trackers, cookies, authentication, sessions, or secrets
- Search results are constructed with DOM APIs and `textContent`; user input is never assigned to `innerHTML`
- URL query parameters are matched only against bundled city slugs and are never executed or reflected as markup

## Deployment caveat

Security headers in `.htaccess` depend on the hosting stack honoring Apache directives. Verify response headers after deployment. Do not add secrets or API keys to browser JavaScript.

## Accuracy caveat

Clock comparison is network-latency-sensitive. The app reports uncertainty and does not claim NIST, GPS, PTP, or atomic-clock traceability.
