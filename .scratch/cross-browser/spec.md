# Spec: cross-browser

Status: ready-for-agent
Supersedes: `.scratch/browser-parity/issues/10-cross-browser-matrix.md`
Evidence and open questions: `.scratch/browser-parity/cross-browser.md`

## Problem Statement

I want to control whichever Chromium browser I have open (Chrome, Edge, Brave, Opera, Vivaldi, Chromium) and not only Vivaldi, on whatever computer I use. Today almost everything was built and checked on Windows with Vivaldi and a headless Edge. The launcher only knows Windows paths and PowerShell, the broker's discovery file lives under a Windows folder, branded Chrome cannot even load the extension from the command line, and the behaviours I fixed on my real Vivaldi (minimized capture, empty new tabs) were never run on the other browsers. I cannot tell which parts really work elsewhere.

## Solution

A cross-browser pass in two halves. First, a verification matrix: for each supported browser, a repeatable run on a real window with the real extension that records pass or fail per behaviour, so "works on Brave" is a fact with a date and not a belief. Second, make the project portable: the launcher, the discovery file and the install guidance work on Windows, macOS and Linux and know the five or six Chromium browsers. Anything the matrix shows to be browser-specific is fixed by testing the behaviour (what the browser does), never the browser's name.

## User Stories

1. As a user of Chrome, I want `browser_attach` to work with the extension installed by hand, so that I can use my everyday browser.
2. As a user of Edge, I want the same flow, so that my work browser is not a second-class citizen.
3. As a user of Brave, I want the same flow, so that privacy-focused browsers work too.
4. As a user of Opera, I want the same flow, so that I am not limited to the three best-known browsers.
5. As a user of Vivaldi, I want everything that works today to keep working, so that the cross-browser work does not regress my browser.
6. As a user, I want `browser_attach` to tell me exactly how to install the extension in my browser (the right extensions page address and the steps), so that I do not search for it.
7. As a user, I want the install message to name my browser's own extensions page (chrome, edge, brave, opera, vivaldi), so that the address I am told to open exists.
8. As a user, I want to open a new tab with a URL in any supported browser and have it load, so that a browser that leaves new tabs empty does not break the agent.
9. As a user, I want screenshots to work while my browser window is minimized, in every supported browser, so that I can keep working elsewhere.
10. As a user, I want a window the tool had to un-minimize to be minimized again afterwards, in every supported browser.
11. As a user, I want a popup (OAuth login) opened by a page to work in every supported browser, so that signing in is not broken.
12. As a user, I want two Claude sessions to share any supported browser, so that multi-session is not a Vivaldi-only feature.
13. As a user on macOS, I want the tool to find my browsers and start one with a debug port, so that the launched mode works on my Mac.
14. As a user on Linux, I want the same, including browsers installed as packages or as bundles, so that the launched mode works on my machine.
15. As a user on macOS or Linux, I want the broker to keep its discovery file in the usual per-user location for that system, readable only by me, so that the security story holds there too.
16. As a user, I want the tool never to kill a process that is not its own on any system, so that portability does not weaken the safety rule.
17. As a user, I want the tool to say clearly when my browser is not supported (a non-Chromium one), so that I do not wait for something that cannot work.
18. As a maintainer, I want one command that runs the matrix for a given browser and prints a table of pass or fail with the evidence, so that results are comparable across browsers and dates.
19. As a maintainer, I want the matrix to record which browser version and operating system each result came from, so that a regression can be tied to an update.
20. As a maintainer, I want the matrix results saved in the repo under one file, so that "proven where" is always answerable.
21. As a maintainer, I want the manual steps (install the extension, minimize the window, open a second session) listed once and the automated steps run without touching my screen, so that running the matrix is cheap and does not disturb me.
22. As a maintainer, I want platform differences isolated in one small layer with the platform injectable in tests, so that I can test macOS and Linux behaviour on a Windows machine.
23. As a maintainer, I want every browser-specific workaround to be triggered by an observed behaviour and to name the browser it was first seen on in a comment or note, so that the next reader knows why it exists.
24. As a maintainer, I want the cross-browser audit note kept in sync with the matrix, so that the two never contradict each other.
25. As a maintainer, I want the unit tests to cover the platform layer (paths, command-line parsing, discovery location) without needing any browser, so that portability bugs are caught fast.

## Implementation Decisions

- **Supported set**: Chrome, Edge, Brave, Opera, Vivaldi and Chromium on Windows, macOS and Linux. Firefox and Safari are declared unsupported (no debugger extension API) and say so when asked.
- **Platform layer**: one small module owns everything that differs by operating system: where each browser's program usually lives, how to list a process's command line and stop a process tree, where the per-user data folder for the discovery file lives, and the address of each browser's extensions page. The platform is a parameter so tests can run macOS and Linux cases anywhere.
- **Launcher and broker client** use the platform layer; their public behaviour (tool names, arguments, messages) does not change.
- **Ownership safety is unchanged**: a process is only stopped after its command line proves it carries this tool's own marker (profile folder or broker directory), on every platform.
- **Discovery file**: Windows keeps the local app data folder; macOS uses the application support folder; Linux uses the state home. All owner-only. ADR 0002 gets a short note per platform.
- **Install guidance**: `browser_attach` names the extensions page of the browser that the extension would be loaded into when it can tell (from the connected browser's product string) and otherwise lists the address for each browser.
- **Browser-specific behaviour**: decided by what the browser does, as already done for the empty new tab and the capture fallbacks. New workarounds found by the matrix follow the same rule and are recorded in the audit note with the browser and version where they were first seen.
- **Matrix runner**: an automated run per browser that drives the real tools against a browser with the real extension already installed by the user, covers the behaviours in the stories above, and writes one results table (browser, version, system, behaviour, pass or fail, evidence). It never takes focus, never moves the mouse and never opens a window on the user's main monitor except where a step is marked manual.
- **Manual steps** are the only ones that need the user: installing the extension once per browser, minimizing the window, opening a second Claude session. The runner prints them as a short checklist and waits.
- **Extension distribution** (store listing, packaged installer) is a later decision; this spec keeps "Load unpacked" and documents it per browser.

## Testing Decisions

- A good test checks behaviour from outside: what a path helper returns for a given system, what the install message says, which processes are touched, what the matrix reports for a scripted fake browser. Not internal helpers.
- **Seam 1, the platform layer**: unit tests with the platform injected (Windows, macOS, Linux) for browser discovery, extensions-page addresses, discovery-file location, command-line ownership parsing. Prior art: the launcher and ownership tests in the existing launcher test file.
- **Seam 2, the matrix runner on a real browser**: the highest seam. It is the same kind of end-to-end run as the existing live test (real MCP server, real extension), but against the user's installed browsers one at a time. Prior art: the attached section of the existing live test.
- The runner itself is checked with a scripted fake browser so its table and its refusal to touch the user's screen are tested without a real window.
- Results from real browsers are evidence, not tests: they are saved in the repo and re-run when a browser updates or a fix lands.

## Out of Scope

- Firefox, Safari and any browser without a debugger extension API.
- Publishing the extension to a store or building an installer; automatic extension install.
- Making the extension work in a managed browser whose policy forbids unpacked extensions.
- Mobile browsers.
- Per-site permission prompts, the Stop button and the other roadmap items.

## Further Notes

- Branded Chrome ignores the command-line switch that loads an extension, which is why the automated live test uses Edge as the stand-in for "the user's browser". The matrix does not depend on that switch: it assumes the extension is already installed by hand.
- The seams proposed above are the platform layer (unit) and the matrix run on a real browser (end to end). The user is asked to object if they expected a different split.
