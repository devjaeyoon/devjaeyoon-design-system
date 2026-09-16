---
"@devjaeyoon-design-system/design-token": minor
"@devjaeyoon-design-system/css": minor
"@devjaeyoon-design-system/react": minor
---

Add shared Button and IconButton roles, sizes and states: outline variant, independent danger tone,
start/end icons, configurable loadingLabel (default "처리 중"), and an IconButton with a required
aria-label. Export the new component and public types. Preserve native button props and default
both controls to type="button".

Add rem-based radius-control and size-control-sm/md/lg tokens and their primitive values. Button
corners change from 8px to 12px and large minimum height from 48px to 52px. Loading now retains
variant colors while disabling interaction; icons/spinners are decorative and loading announcements
preserve the action name. Reduced motion stops spinner rotation. Existing TextField styling and
light/dark/system and djy layer contracts remain unchanged.

Document role selection, sizing, accessibility, service color overrides and Tailwind layer order;
verify interactions, theme scope, contrast and the independently installed tarball consumer.

Adjust critical weak pressed backgrounds in light and dark to meet 4.5:1 text contrast, using
new red 150/850 primitive steps without changing critical foreground or TextField styling.
