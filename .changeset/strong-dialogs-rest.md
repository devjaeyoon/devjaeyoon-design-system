---
"@devjaeyoon-design-system/css": minor
"@devjaeyoon-design-system/react": minor
---

Add a native modal Dialog with a composed title, scrollable body, footer, responsive sizes, and controlled or uncontrolled state. Support nested dialogs, Suspense, dialog-contained portals, and validated focus restoration using the trigger for the current session without carrying it into later programmatic openings.

Preserve native close results and rejected controlled sessions, prevent stale events from closing reopened dialogs, and restore background overflow styles after closing. Keep dismissal policy in DialogRoot by managing native closedby internally, preventing native light dismiss from bypassing Root options or duplicating close requests. Refresh body scroll indicators and automatic tabIndex during nested content size transitions, including padding and border changes, without observing nested dialogs. Keep focused controls visible as the viewport changes and hidden buttons out of keyboard navigation.
