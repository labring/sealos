# DESIGN.md

## Design Register

Applaunchpad is an operational product UI. The interface should feel quiet, dense, and predictable:
users are configuring running infrastructure, not browsing a marketing site.

## Visual Language

- Use the existing Chakra UI and `@sealos/ui` component patterns.
- Prefer compact forms, clear labels, and stable row layouts for repeated network/storage/env items.
- Keep action buttons direct and close to the object they affect.
- Avoid decorative sections, nested cards, and oversized hero-style headings inside the app shell.

## Interaction Principles

- Validate close to the field when possible, with submit-time validation as the final guard.
- Preserve full technical values for copy/open actions even when a row visually truncates them.
- Long hostnames and image names should remain inspectable through copy, tooltip, or selectable text.
- Error copy should identify what failed and what the user can change.

## Networking UX

Generated public hosts are technical identifiers. Show enough context for users to recognize them,
but never truncate the underlying copied/opened value. `publicDomain` follows DNS label constraints,
with a maximum of 63 characters.
