# Precision Time

![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=000)
![PHP](https://img.shields.io/badge/PHP-Server%20Time-777BB4?logo=php&logoColor=fff)
[![License: MIT](https://img.shields.io/badge/License-MIT-d4b106)](LICENSE)
![Version](https://img.shields.io/badge/version-1.0.1-0ea5e9)
[![Live](https://img.shields.io/badge/live-osgk.com%2Ftime-22c55e)](https://osgk.com/time/)

**A privacy-first precision world clock that measures your device clock against a same-origin server timestamp, displays world time, and calculates sunrise and sunset locally.**

[**Open the live app →**](https://osgk.com/time/)

---

## What it does

Precision Time is a static-first browser application designed for fast shared-hosting deployment with a very small attack surface.

- Large live local clock with seconds and 12/24-hour display
- Automatic browser timezone detection using IANA timezone identifiers
- Nine-sample clock comparison with latency-aware uncertainty
- Sunrise, sunset, and daylight duration calculated locally from coordinates
- Searchable bundled city dataset
- World clocks for Los Angeles, London, Paris, Beijing, and Tokyo
- Dark, light, and system themes
- Shareable `?city=slug` URLs
- Keyboard-accessible, responsive interface
- No accounts, database, analytics, advertising, or tracking

## Architecture

```text
Browser
├── HTML / CSS / vanilla JavaScript
├── IANA timezone data via Intl
├── bundled city dataset
├── local solar calculations
└── /api/time.php
      └── current server Unix time in milliseconds
```

Production requires only static files plus one read-only PHP endpoint. No Node.js process, database, API key, external JavaScript library, or paid data feed is required.

## Clock accuracy model

The browser takes nine timestamp samples from the same-origin server endpoint.

For each sample it records:

```text
T1 = client send time
T2 = server timestamp
T3 = client receive time

RTT = T3 - T1
estimated offset = client midpoint - server timestamp
```

The implementation favors lower-latency samples, calculates a median offset, and reports a conservative uncertainty estimate.

> This is an internet clock-comparison estimate. It is not a NIST, GPS, PTP, atomic-clock, or metrology traceability claim. Network-path asymmetry remains a source of error.

## Privacy and security

The production application has a deliberately small attack surface:

- no login or user accounts
- no database
- no cookies
- no third-party scripts or trackers
- no secrets or API keys in browser code
- no cross-origin application API calls
- restrictive Content Security Policy
- clickjacking and MIME-sniffing protections
- non-cacheable timestamp endpoint
- user search input is rendered with DOM APIs and `textContent`

See [SECURITY.md](SECURITY.md) for implementation details.

## City data

`data/cities.json` contains 80 curated cities with IANA timezone identifiers and coordinates.

Example:

```json
{
  "slug": "new-york",
  "name": "New York",
  "country": "United States",
  "timezone": "America/New_York",
  "lat": 40.7128,
  "lon": -74.006
}
```

Additional cities can be added without changing the search logic.

## Local development

Run the project with PHP's built-in development server:

```bash
php -S 127.0.0.1:8080
```

Then open:

```text
http://127.0.0.1:8080/
```

Run the logic tests with Node.js 18+:

```bash
npm test
```

Node.js is used only for development tests and is not required in production.

## SiteGround deployment

1. Create `public_html/time/`.
2. Upload the **contents** of the repository into that folder.
3. Confirm PHP is enabled.
4. Open `https://YOUR-DOMAIN/time/api/time.php`.
5. Verify it returns fresh JSON such as:

```json
{"unix_ms": 1791425635123}
```

6. Ensure `/time/api/time.php` is excluded from server/CDN caching.
7. Open the application and use **Measure again** to verify clock comparison.

The production deployment for this repository is:

**https://osgk.com/time/**

## Repository verification

The repository includes:

- `VERIFICATION.md` for implementation checks
- `CHECKSUMS.sha256` for packaged-file integrity
- `SECURITY.md` for security controls and deployment caveats

## License

Released under the [MIT License](LICENSE).

Copyright © 2026 Lorenzo Geraci.
