# Finish Resurrect in Kiro

Paste the prompts in order, one at a time. Wait for each to finish before the next. Menu names inside Kiro were not checked by the author of this page.

## One-time setup on your PC

1. Install Kiro from https://kiro.dev and sign in. If you want the free hackathon credits, request them before December 2, 05:00 JST (see KIROWEEN-RULES.md).
2. Make sure Node 22 is the Node that Kiro's terminal uses: node --version should start with v22. On this PC it is in C:\Users\ritekit\nodejs22.

Then open the folder C:\Users\ritekit\scriptsold in Kiro.

## Prompt 0: check the starting point

"Read .kiro/steering and .kiro/specs/resurrect. Do not change anything. Run npm test and npm run build. Then tell me which tasks in tasks.md are not done."

You should see: all tests pass (102 on November 25), the build ends without errors, and tasks 10 to 20 listed.

## After every task: the commit prompt

"Run npm test and npm run build. If both pass, commit the changes you made with git. Start the commit message with Kiro: and the task number. Add no co-author line for any other tool. Then push to main."

You should see: a new commit on GitHub whose message starts with Kiro:. This history is your evidence. Commit from Kiro, not from another assistant. If the hook runs the tests when a file is saved, take a screenshot of it. Also save a screenshot of each task run, or Kiro's exported chat if it offers that, into .kiro/logs/ and include it in the commit.

Never ask another AI assistant to write the code for these tasks.

## Task prompts

1. "Run task 10 in .kiro/specs/resurrect/tasks.md." You should see: a new .kiro/settings/mcp.json and a second hook file. Check that the MCP server is one you really use and that no key is in the file.
2. "Run task 11 in .kiro/specs/resurrect/tasks.md." You should see: public/graveyard.html with a tombstone for every registry entry, linked from the home page. To look: npx serve public.
3. "Run task 12 in .kiro/specs/resurrect/tasks.md." You should see: src/compat/translate.js and passing property tests.
4. "Run task 13 in .kiro/specs/resurrect/tasks.md." You should see: functions/compat/ and tests that get a sample answer labelled as a sample.
5. "Run task 14 in .kiro/specs/resurrect/tasks.md." You should see: tests for 401, 422, 404 and 502, and no real FoxAPIs call.
6. "Run task 15 in .kiro/specs/resurrect/tasks.md." You should see: tests for 413 and 429.
7. "Run task 16 in .kiro/specs/resurrect/tasks.md." You should see: a new home page section; all copy tests pass.
8. "Run task 17 in .kiro/specs/resurrect/tasks.md." You should see: new detection tests, including cases that must not match.
9. "Run task 18 in .kiro/specs/resurrect/tasks.md." You should see: small page fixes and a short list of what was checked. Try the page with the keyboard yourself.
10. "Run task 19 in .kiro/specs/resurrect/tasks.md." You should see: a link report. A site that blocks scripts can show an error while working in a browser; open those yourself.

## Deploy (you, once)

In a terminal: npx wrangler login, then click Allow in the browser. Then: npm run deploy. You should see: Status: LIVE with https://scriptsold.pages.dev. If the compat routes do not answer on the live address, ask Kiro: "The routes in functions/ do not answer on the deployed Pages site. Find out why and fix the deploy."

Then ask Kiro: "Commit README.md and submission/devpost.md with a message starting Kiro: and push."

## Last prompt

"Run task 20 in .kiro/specs/resurrect/tasks.md. Use the git log to see what you really changed. Do not claim anything that did not happen." You should see: the usage page names your Kiro commits. Read it and correct anything that is not true.

If time runs short: do tasks 10, 11, 12, 13 and 20 first (they give the most to show), then deploy.
