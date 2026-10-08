# Precision Time

A static-first, privacy-first world clock for shared hosting. The UI is inspired by premium cinematic product interfaces while remaining original and utility-focused.

## Live site

https://osgk.com/time/

## Source code

https://github.com/lor3nzo/precision-time

## License

MIT License. Copyright © 2026 Lorenzo Geraci. See `LICENSE`.

## Features

- Large live clock with 12/24-hour and seconds controls
- Browser timezone detection using IANA timezone identifiers
- Nine-sample same-origin server clock comparison with latency-aware uncertainty
- Sunrise, sunset, and daylight duration calculated locally from city coordinates
- Searchable bundled city dataset
- Five world-clock cards: Los Angeles, London, Paris, Beijing, Tokyo
- Dark, light, and system themes
- Shareable `?city=slug` URLs
- LocalStorage preferences only; no database, login, analytics, or tracking
- Responsive and keyboard-accessible UI

## Runtime architecture

Production requires only static files plus PHP for `api/time.php`. No Node.js process, database, API key, external JavaScript, CDN library, or paid feed is required.

The browser uses its IANA timezone data for time-zone and DST rules. Solar times are calculated locally. The server endpoint returns its current Unix timestamp in milliseconds and is deliberately non-cacheable.

## SiteGround deployment

1. In SiteGround Site Tools, open **Site > File Manager** or deploy via SFTP.
2. Create `public_html/time/`.
3. Upload the **contents** of this project folder into `public_html/time/`.
4. Confirm PHP is enabled for the site. The app uses only basic PHP available on standard shared hosting.
5. Open `https://YOUR-DOMAIN/time/api/time.php`. It should return JSON such as `{"unix_ms":1791425635123}`.
6. Confirm the response headers include `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`.
7. If SiteGround Optimizer or a CDN overrides caching for the endpoint, exclude `/time/api/time.php` from caching.
8. Open `https://YOUR-DOMAIN/time/` and click **Measure again**. Verify the accuracy panel reports samples and a round-trip time.

If your site uses a custom server configuration that does not honor `.htaccess`, reproduce the headers from `.htaccess` in SiteGround/CDN settings.

## Accuracy model

The browser takes nine timestamp samples. For each sample it records the client send time, client receive time, and server timestamp. It estimates clock offset from the client midpoint, sorts samples by round-trip latency, uses the faster half, and calculates a median offset plus a conservative uncertainty estimate based on latency and median absolute deviation.

This is an internet clock-comparison estimate, not an atomic-clock or metrology claim. Network-path asymmetry remains a source of error.

## City data

`data/cities.json` contains 80 curated major cities with IANA timezone IDs and coordinates. Add cities with this shape:

```json
{"slug":"new-york","name":"New York","country":"United States","timezone":"America/New_York","lat":40.7128,"lon":-74.0060}
```

Use valid IANA timezone identifiers. The search UI automatically includes added records.

## Local development

PHP server:

```bash
php -S 127.0.0.1:8080
```

Then open `http://127.0.0.1:8080/`.

Run logic tests with Node.js 18+:

```bash
npm test
```

Node.js is needed only for development tests, not production.

## Security posture

See `SECURITY.md`. The app has no user accounts, forms that submit data, database, third-party scripts, dynamic HTML injection, or cross-origin API access. A restrictive Content Security Policy is included both in HTML and `.htaccess`.
