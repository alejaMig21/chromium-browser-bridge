# Cross-browser matrix results

version = the browser's user-agent token; browsers that do not announce their own name (Vivaldi) show the Chromium engine version. Rows are appended per run: the first Vivaldi run (screenshot size fail) is kept next to the run after the fix.

| date | browser | version | system | behaviour | result | evidence |
|---|---|---|---|---|---|---|
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but the tab they are looking at is in use by another Claude session, so this session has no tab yet. Open your own with tabs |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:5923/ |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:5923/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:5923/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | fail | reported undefinedxundefined, image undefinedxundefined |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but the tab they are looking at is in use by another Claude session, so this session has no tab yet. Open your own with tabs |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:13431/ |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:13431/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:13431/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1530x698, image 1530x698 |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-18 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:3352/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:3352/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:3352/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | fail | page.screenshot: Protocol error (Page.captureScreenshot): chrome.debugger.sendCommand timed out after 8s in the browser. Call log: [2m - taking page screenshot |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |

Note 2026-11-19: the last Vivaldi run above (screenshot size fail, `timed out after 8s`) was taken with another window covering Vivaldi; the same row now records skipped with that reason. Re-run with Vivaldi in front to get a pass.
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:10244/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:10244/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:10244/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | skipped | not testable now, the browser window is covered by another window (a browser cannot paint it): page.screenshot: Protocol error (Page.captureScreenshot): The tab |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1530x698) - ID: screenshot_1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1383959836 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:10244/ Source element: <body> --- MATRIX-PA |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 59952 still alive, up 19 s (it may predate this run, so the closed session need not be the one that started it); first ses |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:10409/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:10409/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:10409/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | skipped | not testable now, the browser window is covered by another window (a browser cannot paint it): page.screenshot: Protocol error (Page.captureScreenshot): The tab |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1530x698) - ID: screenshot_1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1383959844 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:10409/ Source element: <body> --- MATRIX-PA |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 78916 still alive, up 18 s (it may predate this run, so the closed session need not be the one that started it); first ses |

Note 2026-11-19 (second Vivaldi run, `--drive`): all four formerly manual rows pass on the real Vivaldi, run by the runner with no input from the user. `screenshot size` stays skipped because the browser window was covered by the terminal (a browser paints nothing for a covered window; the same capture works right after the window is restored, as the minimized row shows). The first Vivaldi run in this file measured 1530x698 reported and image, so the size itself was already proven.
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:12364/ |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:12364/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:12364/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1530x698, image 1530x698 |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | the window was not minimized |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1383959852 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:12364/ Source element: <body> --- MATRIX-PA |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 78916 still alive, up 520 s (it may predate this run, so the closed session need not be the one that started it); first se |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:5082/ |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:5082/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:5082/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | skipped | not testable now, the browser window is covered by another window (a browser cannot paint it): page.screenshot: Protocol error (Page.captureScreenshot): The tab |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | fail | page.screenshot: Protocol error (Page.captureScreenshot): The tab was shown, but the browser paints nothing for it, usually because another window is covering t |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1383959864 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:5082/ Source element: <body> --- MATRIX-PAG |
| 2026-11-19 | vivaldi (filed as chrome by mistake) | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 78916 still alive, up 680 s (it may predate this run, so the closed session need not be the one that started it); first se |

Correction 2026-11-19: the first two runs filed as `chrome` above were run on Vivaldi, not Chrome. Vivaldi announces itself as "Google Chrome" (same brand list), so the brand check let it through; the runner now also compares the Chromium major of the attached browser with the installed Chrome or Edge (Chrome 154, Edge 153, Vivaldi 156 here) and refuses a run on another browser. A refused attempt (asked for edge, Chrome 154 was attached) was removed from this table; nothing from it was a result.
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:10502/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:10502/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:10502/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | fail | reported 1536x672, image 1536x674 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1536x672) - ID: screenshot_2 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 558661357 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix  |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:10502/ Source element: <body> --- MATRIX-PA |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 70948 still alive, up 217 s (it may predate this run, so the closed session need not be the one that started it); first se |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:12482/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:12482/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:12482/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1536x674, image 1536x674 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1536x674) - ID: screenshot_2 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 558661363 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix  |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:12482/ Source element: <body> --- MATRIX-PA |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 70948 still alive, up 257 s (it may predate this run, so the closed session need not be the one that started it); first se |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:10230/ |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:10230/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:10230/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1528x732, image 1528x732 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1528x686) - ID: screenshot_2 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1865529449 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:10230/ Source element: <body> --- MATRIX-PA |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 37656 still alive, up 13 s (it may predate this run, so the closed session need not be the one that started it); first ses |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:12462/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:12462/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:12462/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | skipped | not testable now, the browser window is covered by another window (a browser cannot paint it): page.screenshot: Protocol error (Page.captureScreenshot): The bro |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1536x674) - ID: screenshot_1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 558661369 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix  |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:12462/ Source element: <body> --- MATRIX-PA |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 23188 still alive, up 22 s (it may predate this run, so the closed session need not be the one that started it); first ses |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:13365/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:13365/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:13365/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1536x674, image 1536x674 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:3538/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:3538/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:3538/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1536x674, image 1536x674 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:6531/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:6531/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:6531/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1536x730, image 1536x730 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1536x730) - ID: screenshot_2 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 558661381 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix  |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:6531/ Source element: <body> --- MATRIX-PAG |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 23188 still alive, up 158 s (it may predate this run, so the closed session need not be the one that started it); first se |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:13234/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:13234/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:13234/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1536x674, image 1536x674 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1536x674) - ID: screenshot_2 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 558661385 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix  |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:13234/ Source element: <body> --- MATRIX-PA |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 23188 still alive, up 176 s (it may predate this run, so the closed session need not be the one that started it); first se |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:9119/ |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:9119/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:9119/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1528x682, image 1528x682 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1528x682) - ID: screenshot_2 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1865529455 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:9119/ Source element: <body> --- MATRIX-PAG |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 22520 still alive, up 18 s (it may predate this run, so the closed session need not be the one that started it); first ses |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:8241/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:8241/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:8241/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | skipped | not testable now, the browser window is covered by another window (a browser cannot paint it): page.screenshot: Protocol error (Page.captureScreenshot): The bro |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | not testable now: after the restore the browser window stays covered by another window, and a browser paints nothing for a covered window: page.screenshot: Prot |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1383959888 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:8241/ Source element: <body> --- MATRIX-PAG |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 50208 still alive, up 23 s (it may predate this run, so the closed session need not be the one that started it); first ses |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:13867/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:13867/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:13867/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1530x698, image 1530x698 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1530x698) - ID: screenshot_2 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1383959896 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:13867/ Source element: <body> --- MATRIX-PA |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 50208 still alive, up 52 s (it may predate this run, so the closed session need not be the one that started it); first ses |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:3628/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:3628/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:3628/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1530x698, image 1530x698 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1530x698) - ID: screenshot_2 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1383959904 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:3628/ Source element: <body> --- MATRIX-PAG |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 50208 still alive, up 69 s (it may predate this run, so the closed session need not be the one that started it); first ses |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:5759/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:5759/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:5759/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1536x674, image 1536x674 in 4492 ms |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:4063/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:4063/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:4063/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1536x674, image 1536x674 in 4515 ms |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:4269/ |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:4269/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:4269/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1528x682, image 1528x682 in 3231 ms |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:4900/ |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:4900/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:4900/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1528x682, image 1528x682 in 3181 ms |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:5284/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:5284/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:5284/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1530x698, image 1530x698 in 835 ms |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:8239/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:8239/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:8239/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1530x698, image 1530x698 in 3290 ms |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:8957/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:8957/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:8957/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1536x674, image 1536x674 in 4465 ms |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:7319/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:7319/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:7319/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1536x674, image 1536x674 in 4408 ms |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:1295/ |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:1295/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:1295/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1528x682, image 1528x682 in 4238 ms |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:2971/ |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:2971/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:2971/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1528x682, image 1528x682 in 4229 ms |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:6060/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:6060/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:6060/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1530x698, image 1530x698 in 4326 ms |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:7513/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:7513/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:7513/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1530x698, image 1530x698 in 4321 ms |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:11158/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:11158/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:11158/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1536x674, image 1536x674 in 4362 ms |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:14221/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:14221/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:14221/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1536x674, image 1536x674 in 4367 ms |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:14625/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:14625/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:14625/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1530x698, image 1530x698 in 775 ms |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:4523/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:4523/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:4523/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1530x698, image 1530x698 in 4330 ms |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | skipped | manual step not done |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | skipped | manual step not done |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:2506/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:2506/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:2506/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1536x674, image 1536x674 in 4349 ms |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1536x674) - ID: screenshot_2 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 558661411 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix  |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:2506/ Source element: <body> --- MATRIX-PAG |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 25316 still alive, up 19 s (it may predate this run, so the closed session need not be the one that started it); first ses |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude session, or it is a browser page (n |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:11875/ |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:11875/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:11875/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1528x682, image 1528x682 in 4201 ms |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1528x682) - ID: screenshot_2 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1865529475 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:11875/ Source element: <body> --- MATRIX-PA |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 75484 still alive, up 18 s (it may predate this run, so the closed session need not be the one that started it); first ses |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they switch tabs. This tool will not c |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:9381/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:9381/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:9381/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | skipped | not testable now, the browser window is covered by another window (a browser cannot paint it): page.screenshot: Protocol error (Page.captureScreenshot): The bro |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | not testable now: after the restore the browser window stays covered by another window, and a browser paints nothing for a covered window: page.screenshot: Prot |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1383959952 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:9381/ Source element: <body> --- MATRIX-PAG |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 64304 still alive, up 30 s (it may predate this run, so the closed session need not be the one that started it); first ses |

Note 2026-11-19 (capture strategy changed to the official extension's): since then captures never show a tab or restore a window; a hidden tab is woken with tiny captures (`Page.captureScreenshot` jpeg quality 1, fromSurface, sent every 0.5 s until the real capture answers, deadline 8 s). With Chrome (154) and Edge (153) both capture rows pass every time, with the window covered by the terminal and, for Edge, minimized by the user all along. A capture of a background tab takes about 4 s. Vivaldi (156) is intermittent while its window is covered or minimized: the two capture rows pass on most runs and are recorded `skipped` (browser paints nothing) on others; `BROWSER_REVEAL_TABS=1` makes the tool show the tab for a moment as the last resort. A refused run of mine (guard bug: Vivaldi announces "Google Chrome") was removed.
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | attach | pass | Browser: chrome (requested). Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude sessio |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:5135/ |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:5135/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:5135/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1920x945, image 1920x945 in 5358 ms |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1920x945) - ID: screenshot_2 |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 558661418 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix  |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:5135/ Source element: <body> --- MATRIX-PAG |
| 2026-11-19 | chrome | Chrome/154.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 26024 still alive, up 31 s (it may predate this run, so the closed session need not be the one that started it); first ses |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | attach | pass | Browser: msedge (requested). Attached to the user's own browser. Tabs in play: 1. Work tab: the one the user was looking at; it stays the default when they swit |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 2 at http://127.0.0.1:5551/ |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:5551/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:5551/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1912x901, image 1912x901 in 4033 ms |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1912x902) - ID: screenshot_2 |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1865529483 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:5551/ Source element: <body> --- MATRIX-PAG |
| 2026-11-19 | edge | Chrome/153.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 26024 still alive, up 57 s (it may predate this run, so the closed session need not be the one that started it); first ses |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Browser: vivaldi (requested). Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude sessi |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:6618/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:6618/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:6618/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | skipped | not testable now, the browser window is covered by another window (a browser cannot paint it): page.screenshot: Protocol error (Page.captureScreenshot): The bro |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | not testable now: after the restore the browser window stays covered by another window, and a browser paints nothing for a covered window: page.screenshot: Prot |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1383959964 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:6618/ Source element: <body> --- MATRIX-PAG |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 26024 still alive, up 86 s (it may predate this run, so the closed session need not be the one that started it); first ses |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Browser: vivaldi (requested). Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude sessi |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:14974/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:14974/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:14974/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | skipped | not testable now, the browser window is covered by another window (a browser cannot paint it): page.screenshot: Protocol error (Page.captureScreenshot): The bro |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | skipped | not testable now: after the restore the browser window stays covered by another window, and a browser paints nothing for a covered window: page.screenshot: Prot |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1383959972 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:14974/ Source element: <body> --- MATRIX-PA |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 26024 still alive, up 233 s (it may predate this run, so the closed session need not be the one that started it); first se |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | attach | pass | Browser: vivaldi (requested). Attached to the user's own browser, but this session has no tab yet: the tab they are looking at is in use by another Claude sessi |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | create tab with URL | pass | Created tab 1 at http://127.0.0.1:10308/ |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | read | pass | Title: matrix URL: http://127.0.0.1:10308/ Source element: <body> --- MATRIX-PAGE Click me clicked 0 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | click | pass | Title: matrix URL: http://127.0.0.1:10308/ Source element: <body> --- MATRIX-PAGE Click me clicked 1 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot size | pass | reported 1914x914, image 1914x914 in 4041 ms |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | popup native | pass | function open() { [native code] } |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | screenshot while minimized | pass | Successfully captured screenshot (1914x914) - ID: screenshot_2 |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | tab switch keeps work tab | pass | browser tab 1383959980 was activated and the user's tab put back (through the extension's reveal/hide, so the bridge is not told it was the user); Title: matrix |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | two sessions | pass | second session: attach ok, own tab 1, read ok; broker sessions 2; first session: Title: matrix URL: http://127.0.0.1:10308/ Source element: <body> --- MATRIX-PA |
| 2026-11-19 | vivaldi | Chrome/156.0.0.0 | win32 10.0.26100 | broker survives the starter closing | pass | closed the second session; broker pid 26024 still alive, up 252 s (it may predate this run, so the closed session need not be the one that started it); first se |
