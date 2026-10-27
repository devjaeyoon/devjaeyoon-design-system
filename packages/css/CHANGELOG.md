# @devjaeyoon-design-system/css

## 0.2.1

### Patch Changes

- 7478cba: Rebuild package artifacts with patched build tooling. Public APIs and peer dependency requirements are unchanged.

## 0.2.0

### Minor Changes

- 6f4af5a: Add a native modal Dialog with a composed title, scrollable body, footer, responsive sizes, and controlled or uncontrolled state. Support nested dialogs, Suspense, dialog-contained portals, and validated focus restoration using the trigger for the current session without carrying it into later programmatic openings.

  Preserve native close results and rejected controlled sessions, prevent stale events from closing reopened dialogs, and restore background overflow styles after closing. Keep dismissal policy in DialogRoot by managing native closedby internally, preventing native light dismiss from bypassing Root options or duplicating close requests. Refresh body scroll indicators and automatic tabIndex during nested content size transitions, including padding and border changes, without observing nested dialogs. Keep focused controls visible as the viewport changes and hidden buttons out of keyboard navigation.

## 0.1.0

### Minor Changes

- cdf362a: Add shared Button and IconButton roles, sizes and states: outline variant, independent danger tone,
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

- a8c5318: Establish the initial design token, CSS theme, and React component packages.
- 4581469: Add TextField with native input props, accessible label/description/error associations, and themed
  styles. Include a profile editing form example and Korean usage documentation. Improve dark theme
  placeholder contrast by using slate.400.

### Patch Changes

- 429ce8d: Prepare the packages for public npm distribution with explicit public access and official registry
  metadata. Validate the publishing metadata as part of each package check.
