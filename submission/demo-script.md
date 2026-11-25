# Demo script (target 2:40, hard cap 3:00)

Record one take at 1280 by 720, dark system theme, sound on, no music. Start with an empty paste box, and have the repository folder open in a code editor with a terminal (use Kiro as the editor only if Kiro was really used, see the note at the end). The address shown on screen is whatever https://scriptsold.pages.dev serves once the deploy step has been run and the status line in README.md says LIVE. Until then, record from a local copy (npx serve public) and do not show or say a live address.

[SAUL: if Kiro really built tasks before you record, replace the spoken line in the 1:55 scene with what Kiro did, and update its word count.]

| Time | Screen and exact clicks | Spoken line | Words |
|---|---|---|---|
| 0:00 to 0:14 | Landing page, hero. Do not touch anything. The tombstone shows R.I.P., then cracks and turns green. | "Old scripts still call APIs that have been switched off. This is Resurrect. It brings that code back to life." | 20 |
| 0:14 to 0:32 | Beforehand, copy all of docs/examples/01-proxycurl-person-profile/input.py. Scroll to the paste box, point at the green privacy box, click in the paste box, press Ctrl+V, then click the button Resurrect. | "Here is a sample Python script that calls Proxycurl. I paste it and press Resurrect. The rewrite runs in your browser, and nothing you paste is sent anywhere." | 28 |
| 0:32 to 0:52 | The card is stamped Resurrected. Hover the link Source notice. | "It finds the dead call, shows when it ended, and links the vendor's own notice. FoxAPIs has a matching live endpoint, so the tombstone turns green." | 26 |
| 0:52 to 1:20 | Scroll to Your code, rewritten. Click the tab JavaScript, then the tab Python, then Copy. Scroll to Field mapping and rest on a row that says none. | "Here is the script with the old call replaced and the variable names kept. The generated code returns the old field names. Anything FoxAPIs cannot fill is null, with the reason." | 31 |
| 1:20 to 1:40 | Switch to a terminal in the repository folder. Type node --test tests/generated.test.js and press Enter. Let the pass lines and the pass count show. | "And it runs. These tests execute the generated JavaScript and Python against recorded FoxAPIs responses. No key and no credits are needed for this." | 24 |
| 1:40 to 1:55 | Back to the browser. Click Clear, then the chip Bing Search, Python. The card shows Stays buried. Point at the marker comment in the code. | "Bing Search has no equivalent here, so Resurrect says so, leaves the code alone and adds a marker comment." | 19 |
| 1:55 to 2:30 | In the editor, open in this order: .kiro/specs/resurrect/requirements.md (scroll to an acceptance criterion), design.md (Correctness Properties), tasks.md, .kiro/steering/product.md, .kiro/hooks/run-tests-on-save.json. | "The repository carries a Kiro spec: requirements with acceptance criteria, a design with correctness properties, a task list, steering files for the honesty rules, and a hook set to run the tests on save." | 34 |
| 2:30 to 2:40 | Browser, scroll to the footer so the disclaimer and the repository link show. | "Resurrect. Not affiliated with the services named. Link and source are in the description." | 14 |

Total: 196 words, 160 seconds (2:40). 20 seconds of margin under the 3:00 cap.

## Rules for the recording

- No music. No third-party logos beyond the names in the page text. Do not show any key. The paste box only ever holds the built-in examples.
- Say "FoxAPIs". Do not name any AI model and do not describe where the data comes from.
- Do not state any speed, accuracy or price. Do not present the site as running until the deploy script has flipped the status line.
- Do not cut away for the Clear click; it is part of the take.
- The official rules say the video must not include third-party trademarks without permission. This script shows and says names of dead services (Proxycurl, Bing Search) and the Kiro name. Decide before recording (see the checks in the Devpost draft).
- In the editor and terminal, close any file or tab that could show a key.

## Note on the Kiro scene (honesty)

The scene above shows files in the repository. It does not say Kiro wrote the code, and it must not. If before recording Kiro has really implemented tasks from tasks.md, replace the Kiro sentence with one true line about what Kiro did (for example: "Kiro implemented tasks X and Y from the spec; the transcripts are in the repository") and add a 20 second clip of that run. If not, keep the scene as written. See submission/kiro-usage.md.
