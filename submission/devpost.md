# Devpost submission draft: Resurrect (scriptsold)

Draft written 2026-11-23, updated 2026-11-25. Not submitted. Fill the form from this file after the checks at the bottom pass. Lines starting [SAUL: are blanks for you to fill; remove them before pasting.

From the official rules (read 2026-11-25): submissions close December 4, 2026, 2:00 pm Pacific (December 5, 7:00 am Japan time). Kiro credit requests close December 1, 12:00 pm Pacific.

## Name

Resurrect (scriptsold)

## Status of the working app

<!-- deploy-status:start -->
Status: not deployed yet. Run scripts/deploy-preview.ps1 after the one-time Cloudflare login. Nothing in this file may say the site is live until that script has fetched the address and flipped this line.
<!-- deploy-status:end -->

Working app address, to be entered in the form only after the status line above says LIVE: https://scriptsold.pages.dev (after the deploy step).
Source repository (public, MIT licence, .kiro folder at the root and not ignored): https://github.com/OsakaSaul/scriptsold

## Category

Resurrection.

Why: the whole project is about reviving things that were switched off. Developers have old scripts that still call APIs that have been shut down. The registry in the repository (docs/REGISTRY.md) lists each one by name, with its status and the vendor's own notice. Resurrect finds those calls, brings back the ones that have a living replacement, and gives the rest an honest burial: a tombstone, the date, and the vendor's own notice.

## Tagline

Paste code that calls a dead API. Get it back to life, or an honest tombstone.

## The story

A script worked for years. Then an API behind it was switched off. (Some APIs only moved, with no published end date, and Resurrect says exactly that.) The code still describes a useful job, but its calls lead nowhere or to an uncertain future. Resurrect brings that code back to life by rewriting a call onto a live FoxAPIs endpoint where one matches. The generated code hands back the old field names, with null and a reason where it cannot fill one. Where nothing matches, it says so. There is no hosted compatibility endpoint today. Plans and pricing: https://foxapis.com

## What it does

- You paste a curl command or JavaScript, TypeScript or Python code.
- Resurrect matches the host, path, auth style and SDK imports against a registry of dated shutdown notices. Every entry has a link to the vendor's own notice, and the status words are exact: ended, scheduled (still live, end date announced) or moved (no end date published, never called shut down).
- If a matching FoxAPIs endpoint exists in the catalog snapshot with status live, it replaces the call in your file (names and surrounding lines kept) and gives standalone JavaScript, Python and curl, a list of what changed, and a field-mapping table. Fields FoxAPIs cannot fill come back as null with the reason. Each mapped result links to the matching FoxAPIs page.
- If there is no equivalent it says so, leaves your code alone and adds a marker comment. It never invents an endpoint, a parameter or a field.
- It runs entirely in the browser. Nothing you paste is sent anywhere, and tests check that the engine makes no network request.
- Halloween look: a tombstone that goes from rest in peace to resurrected, in CSS only, with a reduced-motion version.

## How Kiro was used (honest version)

The full table is in submission/kiro-usage.md. Short version:

- Spec-driven development: .kiro/specs/resurrect has requirements.md (EARS acceptance criteria), design.md (architecture, mapping tables and twelve numbered correctness properties) and tasks.md.
- Steering: .kiro/steering/product.md (the honesty rules), tech.md and structure.md.
- Hook: .kiro/hooks/run-tests-on-save.json runs the tests when a source or test file is saved.
- Property-style tests: tests/properties/ (P1 to P4, P6 to P11) and tests/registry.test.js (P5 and P12). They use a seeded random generator, not the fast-check library.
- MCP and powers: not used.

What Kiro produced and what it did not: the specs, steering and hook were drafted by an AI coding agent as inputs, and the engine in src/, the page and the tests were written by an AI coding agent working from those specs. As of this draft no code was written by Kiro. In tasks.md, tasks 1 to 9 are ticked as built before Kiro was used, and tasks 10 to 20 are open for Kiro. That is why this draft is not ready to submit: the hackathon requires an app built with Kiro. See the checks below.

### Blanks for what Kiro actually did

Fill only with things that happened. Delete any line that did not.

- [SAUL: which Kiro app you used (IDE, CLI, Web, Crew), and how they differed if more than one]
- [SAUL: spec-driven development: which tasks in tasks.md Kiro implemented, with commit ids, and how that compared with vibe coding]
- [SAUL: agent hooks: whether the run-tests-on-save hook fired, and what it caught or saved]
- [SAUL: steering: which steering rule changed what Kiro produced]
- [SAUL: property-based testing: whether it caught anything while Kiro worked]
- [SAUL: custom agents, MCP, powers: say which you used, or not used]

## Challenges

- Dating each shutdown from a linked notice, and keeping ended, scheduled and moved apart, so nothing still running is called dead.
- Never inventing a field: where FoxAPIs has no value, the old field comes back as null with a reason.
- Replacing a whole call inside a file without touching the lines around it.
- Testing generated code without spending credits: it runs against recorded responses.
- [SAUL: a challenge from your own Kiro sessions]

## What is next

Ideas, not built yet:

- A compatibility endpoint that accepts the old request and returns the old response shape.
- More dead APIs in the registry, each with a dated source.
- In-place replacement for more languages.
- A re-check of every source link.

## Built with

JavaScript (no dependencies), HTML, CSS, Node test runner, Cloudflare Pages (static), Kiro specs, steering and hooks.

## Honest limits

- Some old response field lists could not be re-read (a vendor's reference is gone or behind a login); those tables say so.
- The person-profile replacement was checked against a recorded real FoxAPIs response, not live, because each call costs credits. The work-email call was run live through the generated JavaScript and Python (no match, nothing charged).
- Only whole calls that can be located are replaced in place (JavaScript, TypeScript, Python, curl). Other languages get the snippets and a note.
- Detection reads URLs; a URL assembled from several variables may be missed.
- There is no compatibility endpoint that accepts the old request and returns the old response from a server. The generated replacement code returns the old field names itself.

## Names and affiliation

Names of dead APIs are used only to say which service your code calls. Not affiliated with, endorsed by or sponsored by the services named.

## Testing instructions for judges

No account or key is needed to try the rewrite. Open the working app address (once live), click an example chip or paste code, press Resurrect. To run the replacement code for real, a free FoxAPIs key is at https://foxapis.com/trial; set it as FOXAPIS_KEY.

Locally: npm test, then open public/index.html through any static server (npx serve public).

## Checks before submitting

- [ ] Status line above says LIVE (deploy script ran and its curl check passed)
- [ ] Kiro has really implemented work from tasks.md, and submission/kiro-usage.md and the section above were updated to say exactly what
- [ ] Demo video is under 3 minutes, public on YouTube, no unlicensed music (script: submission/demo-script.md)
- [ ] Third-party names in the video: the rules forbid third-party trademarks without permission. The script speaks none, and the names the app and code show on screen are to be covered as listed under Covers in submission/demo-script.md. Step through the finished video and check that none is readable
- [ ] A working application address is in the form (the rules require a functional application URL)
- [ ] New-project rule: the first commit here is dated 2026-11-23, inside the submission period that began October 30; disclose any earlier code brought in
- [ ] Repository is public on GitHub with the MIT licence visible and .kiro at the root (git check-ignore -v .kiro prints nothing)
- [ ] Every statement in this file still matches the repository
