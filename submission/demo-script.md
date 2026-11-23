# Demo script (target 2:35, hard cap 3:00)

Record one take of the page in a browser at 1280 by 720, dark system theme, sound on, no music. Start with an empty paste box. Do the Kiro scene in the repository folder open in a code editor (and in Kiro itself only if Kiro was really used, see the note at the end). The address shown on screen is whatever https://scriptsold.pages.dev serves once the deploy step has been run and the status line in README.md says LIVE. Until then, record from a local copy (npx serve public) and do not show or say a live address.

Pace: 209 spoken words over 155 seconds, about 81 words a minute, which leaves room for the clicks and the animation. No scene needs more than 1.7 words a second. Nothing is sped up.

| Time | Screen and exact clicks | Spoken line | Words |
|---|---|---|---|
| 0:00 to 0:15 | Landing page, hero. Do not touch anything. The tombstone shows R.I.P., then cracks and turns green. | "Every developer has one: a script that still calls an API that no longer exists. This is Resurrect. It brings that code back to life." | 25 |
| 0:15 to 0:25 | Scroll down one screen to the green privacy box and the empty paste box. Hover the Resurrect button so the tooltip shows. | "Paste your code here. Nothing you paste is sent anywhere: the rewrite runs in your browser." | 16 |
| 0:25 to 0:50 | Click the chip "Proxycurl, Python". The code appears, the result opens, the card is stamped Resurrected and the green light rises. Hover "Source notice". | "Let's try a Python script that calls Proxycurl. Resurrect shows when it ended and links the vendor's own notice. FoxAPIs has a matching live endpoint, so the tombstone turns green." | 30 |
| 0:50 to 1:20 | Scroll to "Your code, rewritten". Click the tab JavaScript, then the tab Python, then the Copy button. Scroll to "Field mapping" and rest on a row that says none. | "Here is your file with the old call replaced and your variable names kept. Replacement code in JavaScript, Python and curl. And a field table: anything FoxAPIs cannot fill comes back as null, with the reason. Nothing is invented." | 39 |
| 1:20 to 1:30 | Scroll up to the card. Click the link "FoxAPIs page for Enrich person". A new tab opens on foxapis.com. Close the tab. | "Each match links to the FoxAPIs page, in a new tab." | 11 |
| 1:30 to 1:50 | Click Clear. Click the chip "Bing Search, Python". The card is stamped R.I.P., and "Stays buried" shows with the reason. Point at the marker comment in the code. | "Now Bing Search. There is no equivalent, so Resurrect says so, leaves your code alone, and adds a marker comment. Honest beats clever." | 23 |
| 1:50 to 2:25 | Switch to the code editor on the repository. Open .kiro/specs/resurrect/requirements.md (scroll to an acceptance criterion), design.md (scroll to "Correctness Properties"), .kiro/steering/product.md, .kiro/hooks/run-tests-on-save.json. In a terminal run npm test and let the pass count show. | "Under the hood is a Kiro spec: requirements with acceptance criteria, a design with correctness properties, steering files for the rules, and a hook set to run the tests when a file is saved. The tests include property tests, like: a secret is never echoed, and an unmapped call is never rewritten." | 52 |
| 2:25 to 2:35 | Back to the browser, top of the page, then scroll to the footer so the disclaimer shows. | "Resurrect. Not affiliated with the services named. Link and source in the description." | 13 |

Total: 209 words, 155 seconds (2:35). 25 seconds of margin under the 3:00 cap.

## Rules for the recording

- No music. No third-party logos beyond the names in the page text. Do not show any key. The paste box only ever holds the built-in examples.
- Say "FoxAPIs". Do not name any AI model and do not describe where the data comes from.
- Do not state any speed, accuracy or price. Do not present the site as running until the deploy script has flipped the status line.
- Do not cut away for the Clear click; it is part of the take.

## Note on the Kiro scene (honesty)

The scene above shows files in the repository. It does not say Kiro wrote the code, and it must not. If before recording Kiro has really implemented tasks from tasks.md, replace the Kiro sentence with one true line about what Kiro did (for example: "Kiro implemented tasks X and Y from the spec; the transcripts are in the repository") and add a 20 second clip of that run. If not, keep the scene as written. See submission/kiro-usage.md.
