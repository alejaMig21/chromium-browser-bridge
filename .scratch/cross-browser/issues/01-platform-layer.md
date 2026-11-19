# 01: Platform layer

**What to build:** everything that differs by operating system (where each browser lives, how to read a process's command line and stop a process tree, where the per-user data folder for the discovery file is, the address of each browser's extensions page) lives in one module whose platform can be injected. On Windows every existing behaviour is unchanged; macOS and Linux answers are covered by unit tests that simulate them.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] One platform module answers browser locations, process inspection and stopping, discovery folder and extensions-page address for Windows, macOS and Linux; the platform is a parameter.
- [x] The launcher and the broker client use it; their tools, arguments and messages are unchanged on Windows.
- [x] Unit tests (no browser needed) cover each answer for each platform, including ownership parsing of a command line.
- [x] The existing unit and live tests still pass.
