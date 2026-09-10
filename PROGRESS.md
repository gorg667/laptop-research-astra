# Laptop Field Guide — project progress

## 2026-09-10
- User requested an exceptionally comprehensive, well-researched laptop buying guide for CS students, software engineers, and daily use, delivered as Markdown and a reading website.
- Workspace began with AGENTS.md only. Remote: gorg667/laptop-research-astra. Development branch: genspark_ai_developer. GitHub CLI authentication works.
- Plan: primary-source compatibility research, independent model reviews, substantial original handbook, static accessible website with full-text search, navigation, shortlist/decision helpers, downloadable Markdown, automated checks, public sandbox preview and portable website archive.
- Editorial rules: no hands-on testing claims; distinguish manufacturer specs, independent observations, and editorial recommendations; date all price examples; no fabricated current deals or benchmark results; cover country/curriculum uncertainty explicitly.
- Initial primary research confirms Apple M5 Air announced March 3 2026 with US launch prices $1,099/$999 education (13-inch), $1,299/$1,199 education (15-inch), 512 GB base storage, two Thunderbolt 4 ports, fanless design. Source: https://www.apple.com/newsroom/2026/03/apple-introduces-the-new-macbook-air-with-m5/ . Launch prices are not September street prices.
- Microsoft Arm FAQ confirms native Arm64 drivers required, native VS/VS Code available, and local Arm Hyper-V guests supported. Source: https://learn.microsoft.com/en-us/windows/arm/faq . Do not conflate user-space emulation with x86 guest virtualization.
- Current independent reviews exist for M5 Air, ThinkPad T14 Gen 7 and Framework Laptop 13 Pro; do not label 2025 machines as newest. Need targeted reads and official specification checks.
- Next: gather requirements and review evidence into research.json, then author laptop-buying-guide.md in independently committed sections.

## 2026-09-10 — reset-safe handbook checkpoint
- Recovered twice from resets by switching to origin/genspark_ai_developer. Main intentionally remains unchanged pending PR.
- Complete laptop-buying-guide.md now pushed: 30 chapters, 35 annotated sources/references, approximately 21,600 whitespace-delimited words. Internal anchors/citations validated.
- research.json preserves checked evidence and limitations. No new research needed to restore the handbook.
- PR: https://github.com/gorg667/laptop-research-astra/pull/1 . Repository is public; GitHub Pages not yet enabled.
- NEXT: build static website from the Markdown as single source: build.py + index.template.html + styles.css + app.js, generated public/ assets. Responsive editorial design, complete no-JS text, chapter router, full-text search, local reading progress, theme/font controls, buying-brief helper and ownership calculator. Include offline ZIP.
- Tooling at checkpoint: Python mistune and bs4 available, Node22/npm10; Playwright not installed after reset. Install tooling only inside workspace.
- Publish preview with GetServiceUrl immediately after server startup. Prefer durable GitHub Pages serving public/ from development branch (or an appropriate static publishing branch) without merging the PR. Verify actual live output. Do not change repo visibility.
- Every write is immediately committed/fetched/rebased/pushed in the same Bash call. Open PR updates with branch pushes; final squash and PR summary at handoff.

## 2026-09-10 — FINAL HANDOFF
- Complete: canonical Markdown, 30 chapters, 35 annotated references (31 read evidence sources, four explicitly marked follow-up references). Rendered text count: 20,435 words; raw Markdown whitespace count: 21,613.
- Website source: index.template.html, styles.css, app.js, build.py. Generated deployable folder is docs/ (not the earlier planned public/).
- Browser QA: test.mjs ran 106 checks successfully, zero page errors and zero automated WCAG A/AA violations in six checked views. Includes all 30 routes, 320–1920px layouts, search, citation navigation, local persistence, blocked storage, JavaScript-disabled reading, print all chapters, tool conflicts and calculator arithmetic. Results preserved in qa-results.json. This is not a claim of full manual accessibility certification.
- Original desktop and mobile design screenshots visually reviewed. Fixed 320px header overflow and added a horizontal-table hint. No third-party images/fonts/analytics used.
- Offline export validated: single HTML opens from disk with chapter routing and search, zero external assets or browser errors.
- Reset recovery: git fetch origin && git switch genspark_ai_developer. No build is needed to serve checked-in docs/. Use python package.py to regenerate ignored artifacts/ exports.
- Build: python build.py (mistune/beautifulsoup4 versions in requirements.txt). Browser setup: bash prepare-tests.sh. Tests: TMPDIR="$PWD/.cache/tmp" LD_LIBRARY_PATH="$PWD/.cache/lib/usr/lib/x86_64-linux-gnu" PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers" npm test . All downloaded dependencies remain workspace-local. Can set BASE_URL for HTTP tests; default validates file:// offline use.
- Serve: python -m http.server 8080 --bind 0.0.0.0 --directory docs . Always retrieve a new GetServiceUrl after a reset; previous preview URLs expire.
- Latest preview: https://8080-in4qowrnxzg4v25pkxjg4-82b888ba.sandbox.novita.ai . This is temporary, not permanent hosting.
- Durable user downloads: Markdown https://www.genspark.ai/api/files/s/DFcaZba5 ; standalone HTML https://www.genspark.ai/api/files/s/nl5BF965 ; website ZIP https://www.genspark.ai/api/files/s/2n0Nb0R2 . User can download HTML and open directly; ZIP can be extracted and index.html opened.
- GitHub Pages activation attempted via API, returned 403 Resource not accessible by integration. No bypass attempted. Repo owner can enable Pages in Settings > Pages > Deploy from a branch > genspark_ai_developer > /docs. After merging the PR, optionally change source to main /docs. Repository visibility was not changed.
- Alternative Genspark hosting confirmation requested in chat but not received. Do not activate/deploy managed hosting without the required confirmation.
- PR: https://github.com/gorg667/laptop-research-astra/pull/1 . Final development history squashed for handoff; main not merged without user request.
