# 08: Session lifecycle with several browsers

**What to build:** a session works in one browser at a time; attaching to another browser releases the tabs it held in the first. When a browser's extension disconnects (the browser closed), only the sessions attached to that browser are closed, with a message that names the browser that was lost and the ones still connected; sessions in other browsers keep working. A tab id that exists in two browsers never collides.

**Blocked by:** 04

**Status:** ready-for-agent

Spec: stories 9, 10, 11, 25, 26, 27, 28 in `.scratch/multi-browser/spec.md`.

- [ ] Two sessions in two browsers keep working when one of the two extensions disconnects (the other's session is unaffected)
- [ ] The session of the browser that went away is closed with a message naming that browser and listing the connected ones
- [ ] Attaching the same session to another browser releases its tabs in the first, which another session can then take
- [ ] Two tabs with the same id in two browsers are owned and commanded independently
- [ ] The foreground tab offered at attach is the foreground tab of the chosen browser, and unclaimed tabs are listed per browser
