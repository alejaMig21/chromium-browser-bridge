# 02: Install guidance per browser

**What to build:** when `browser_attach` finds no extension, it tells the user exactly how to install it in their browser: the right extensions page address (chrome, edge, brave, opera, vivaldi) and the steps. A browser without a debugger extension API (Firefox, Safari) gets a clear "not supported" message instead of an install hint.

**Blocked by:** 01

**Status:** resolved

- [x] The message names the extensions page of the browser when it can be told, otherwise lists the address for each supported browser.
- [x] A non-Chromium browser is reported as unsupported.
- [x] Unit test of the message for each browser; the existing "explains how to install" live check still passes.
