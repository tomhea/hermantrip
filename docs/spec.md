# Spec — country ↔ album mapping

Source of truth for the country-range tests in `src/lib/countries.js`. Given
by the album owner directly:

| Country | Hebrew | Album numbers |
|---|---|---|
| Nepal | נפאל | 1–7 |
| India | הודו | 8–18 |
| Vietnam | ויאטנם | 20–29 |
| China | סין | 30–37 |
| Australia | אוסטרליה | 37–53 |
| New Zealand | ניו זילנד | 54–76 |
| Thailand | תאילנד | 1, 19, 37, 77–88 |

## Cross-country albums

Albums whose numbers appear in more than one country range:

| Album | Countries | Primary (lowest range) |
|---|---|---|
| 1 | Nepal + Thailand | Nepal |
| 37 | China + Australia + Thailand | China |

Album 19 is Thailand-only despite being outside the contiguous 77–88 range —
it still has `countries.length === 1` and stays IN the guessing game.

## Guessing game eligibility

A photo is eligible for the guessing game only if it comes from an album
where `countries.length === 1`. Per the table above, albums 1 and 37 are
excluded. Every other album is eligible.

## Album numbers that don't exist

The ranges skip numbers (e.g., no album "8" gap, no "19" in Vietnam range).
The build script validates that every album folder in Drive maps to exactly
one primary country and that every cross-country album is listed in the
"Cross-country albums" table above. If a new album appears in Drive with a
number not covered by these ranges, the build fails loudly.

## Ordering within an album

Photos are sorted **lexicographically by filename** within an album. NOT
by capture-time or upload-time. This is the explicit user requirement.
