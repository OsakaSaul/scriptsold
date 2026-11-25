# Demo script (target 2:40, hard cap 3:00)

Record one take at 1280 by 720, dark system theme, sound on, no music. Start with an empty paste box, and have the repository folder open in a code editor with a terminal (use Kiro as the editor only if Kiro was really used, see the note at the end). The address shown on screen is whatever https://scriptsold.pages.dev serves once the deploy step has been run and the status line in README.md says LIVE. Until then, record from a local copy (npx serve public) and do not show or say a live address.

[SAUL: if Kiro really built tasks before you record, replace the spoken line in the 1:55 scene with what Kiro did, and update its word count.]

| Time | Screen and exact clicks | Spoken line | Words |
|---|---|---|---|
| 0:00 to 0:14 | Landing page, hero. Do not touch anything. The tombstone shows R.I.P., then cracks and turns green. | "Old scripts still call APIs that have been switched off. This is Resurrect. It brings that code back to life." | 20 |
| 0:14 to 0:32 | Beforehand, copy all of examples/video/old-profile-script.py. Scroll to the paste box, point at the green privacy box, click in the paste box, press Ctrl+V, then click the button Resurrect. Cover M1 and M2. | "Here is a sample Python script that calls a shut-down people-data API. I paste it and press Resurrect. It runs in your browser, and nothing you paste is sent." | 29 |
| 0:32 to 0:52 | The card is stamped Resurrected. Point at the stamp. Do not hover any link. Cover M3. | "It finds the dead call, shows when it ended, and links the vendor's own notice. FoxAPIs has a matching live endpoint, so the tombstone turns green." | 26 |
| 0:52 to 1:20 | Scroll to Your code, rewritten. Click the tab JavaScript, then the tab Python, then Copy. Scroll to Field mapping and rest on a row that says none. Stop scrolling at the end of that table. Cover M4. | "Here is the script with the old call replaced and the variable names kept. The generated code returns the old field names. Anything FoxAPIs cannot fill is null, with the reason." | 31 |
| 1:20 to 1:40 | Switch to a terminal in the repository folder. Type node --test tests/generated.test.js and press Enter. Let the pass lines and the pass count show. | "And it runs. These tests execute the generated JavaScript and Python against recorded FoxAPIs responses. No key and no credits are needed for this." | 24 |
| 1:40 to 1:55 | Back to the browser. Click Clear. Copy all of examples/video/old-search-script.py (cut the copying out of the video), click in the paste box, press Ctrl+V, click Resurrect. The card shows Stays buried. Point at the marker comment in the code. Cover M5. | "This one calls a retired search API. There is no equivalent here, so Resurrect says so, leaves the code alone and adds a marker comment." | 25 |
| 1:55 to 2:30 | In the editor, with the file tree collapsed, open in this order: .kiro/specs/resurrect/requirements.md (scroll to an acceptance criterion before the shot), design.md (at Correctness Properties), tasks.md, .kiro/steering/product.md, .kiro/hooks/run-tests-on-save.json. Cover M6. | "The repository carries a Kiro spec: requirements with acceptance criteria, a design with correctness properties, a task list, steering files for the honesty rules, and a hook set to run the tests on save." | 34 |
| 2:30 to 2:40 | Browser, cut straight to the top of the page so the hero shows. Do not scroll down to the footer: the list of services sits above it. | "Resurrect. Bring your old code back to life. The source is linked in the description." | 15 |

Total: 204 words, 160 seconds (2:40). 20 seconds of margin under the 3:00 cap.

## Covers (add in the video editor)

The official rules say the video must not include third-party trademarks without permission. The two sample files in examples/video/ keep each service name to one line (the old address). That line cannot be renamed, because the app finds a call by its real address, and the app also prints service names itself. So cover every item below with a solid opaque box (not a light blur) that follows the text while it scrolls.

- M1: the row of three example buttons under the paste box. This script does not click them.
- M2: in the paste box, the line that sets the old address (line 5 of the sample).
- M3: the result card title, and any other text on the card that names the old service.
- M4: in the rewritten code, every comment that names the old service, every mention of the social network in field names, patterns and links, and the second link next to the replacement heading. In Field mapping, any cell that names either one. Do not scroll on to What changed or Notes.
- M5: in the paste box and in the rewritten code, the address line (line 8 of the sample), the card title, and any reason or note that names the company.
- M6: in the Kiro files, any text that names a service or company. Known places: the tables near the top of requirements.md and design.md, task 12 in tasks.md, and the data-source rule in product.md. Keep the shot away from them where possible.

After the edit, step through the whole video frame by frame, including scrolls and cuts. If any service or company name is readable, fix the box or cut the frame.

## Rules for the recording

- No music. No third-party logos. Do not show any key. The paste box only ever holds the two files in examples/video/.
- Say "FoxAPIs". Do not name any AI model, do not describe where the data comes from, and do not say the name of any other service or company, including when improvising.
- Do not state any speed, accuracy or price. Do not present the site as running until the deploy script has flipped the status line.
- Do not cut away for the Clear click; it is part of the take.
- Hide the bookmarks bar, other browser tabs, notifications and the taskbar. Do not hover links, because the browser then shows the address at the bottom of the window.
- Do not scroll to the list of dead services and do not open the three worked examples.
- The Kiro name stays: it is the hackathon's own product. FoxAPIs is the project owner's own name.
- In the editor and terminal, close any file or tab that could show a key.

## Note on the Kiro scene (honesty)

The scene above shows files in the repository. It does not say Kiro wrote the code, and it must not. If before recording Kiro has really implemented tasks from tasks.md, replace the Kiro sentence with one true line about what Kiro did (for example: "Kiro implemented tasks X and Y from the spec; the transcripts are in the repository") and add a 20 second clip of that run. If not, keep the scene as written. See submission/kiro-usage.md.
