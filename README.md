# EarthSignal 🌍

**AI that turns environmental evidence into action.**

EarthSignal is an open-source prototype for documenting visible pollution. People submit a photo, choose a location on a map, describe what they observed, and create a downloadable evidence summary. Reports appear on a shared map and can be marked for review or resolution by authorized moderators.

## Features

- Photo-based environmental reports with category, description, and map coordinates
- Shared PostgreSQL-backed report feed
- Interactive Leaflet map with OpenStreetMap tiles
- Basic duplicate warning for matching title, category, and location
- Status workflow: Submitted → Under review → Resolved
- AI-assisted image observations saved with the report when AI is configured
- Downloadable evidence summaries
- Responsive desktop and mobile layout

## Important limitations

This is a hackathon prototype, not a government reporting channel or official environmental monitoring system. Reports are **unverified**. AI output can be wrong and must not be treated as proof of a violation, cause, health effect, or responsible party. The current AI endpoint uses a hosted model and requires provider configuration; this hosted model is not open-weight. If the target challenge requires an open-weight/local AI core, add and test that before claiming compliance.

## Tech stack

HTML, CSS, JavaScript, Leaflet + OpenStreetMap, Hatchable API runtime, PostgreSQL, and an optional hosted vision model through the server-side AI gateway.

## Demo steps

1. Enter a report title, category, and location label.
2. Upload a JPG, PNG, or WEBP photo (compressed by the app before submission).
3. Tap the map to choose coordinates, or grant permission to use your current location.
4. Submit the report. It should appear in the shared feed and on the map.
5. Download its evidence summary.
6. If the AI provider is configured, choose Analyze with AI.

Use sample photographs that you own or are licensed to use. Label demonstration records clearly and do not publish private addresses or identifiable people without consent.

## Development

Application code is in public/, server endpoints are in api/, and the initial database schema is in migrations/0001_create_environmental_reports.sql. Deploy through Hatchable so migrations are applied. Keep provider keys in hosting-platform AI configuration; never put them in browser JavaScript or commit them to Git.

## Privacy and safety

- Browser geolocation is optional and requires permission.
- User-selected coordinates are not independently verified.
- Avoid photographing faces, license plates, or private details.
- Do not accuse a named person or organization based only on a photo.
- Public report submission can attract spam. Before production use, add rate limiting, image storage with retention controls, and report correction/removal workflows.
- Moderator status changes are restricted to signed-in project members.

## Known limitations

Photo bytes are stored in the database as compressed data URLs, suitable only for a small demo; move images to object storage before scaling. Duplicate detection compares title, category, and location text; it does not use image hashes or geographic proximity. The prototype does not automatically send complaints to authorities. The live project may remain private until its owner changes visibility in settings.

## License

MIT — see public/LICENSE.