---
name: Sealos Desktop Frontend
description: Authenticated web desktop and account/workspace control surface for Sealos Cloud.
colors:
  surface: "#FFFFFF"
  surface-muted: "#F4F4F5"
  surface-input: "#F4F6F8"
  ink: "#09090B"
  ink-muted: "#71717A"
  primary: "#18181B"
  primary-button: "#3E3B3B"
  border: "#E4E4E7"
  success: "#039855"
  danger: "#F04438"
typography:
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
  modal: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary-button}"
    textColor: "#FEFEFE"
    rounded: "{rounded.sm}"
    height: "36px"
  input-setting:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Sealos Desktop Frontend

## 1. Overview

The visual system is a restrained product UI built on Chakra UI and `@sealos/ui`.
It uses compact spacing, neutral surfaces, small-radius controls, and predictable
settings patterns. The goal is to help users finish operational tasks quickly,
not to create a branded marketing moment inside the app.

Key characteristics:

- Dense but readable account, workspace, and app-control panels.
- Neutral surfaces with limited semantic color for success, warning, and danger.
- Familiar dialogs and inline settings controls for reversible edits.
- Stronger friction around destructive or authority-changing actions.

## 2. Colors

The palette is neutral-first. Accent colors appear mainly for active state,
success, warning, and destructive action feedback.

### Primary

- **Operational Ink** (`#18181B`): primary text, high-emphasis controls, and core
  interface anchors.
- **Primary Button Charcoal** (`#3E3B3B`): existing primary button background.

### Neutral

- **Surface White** (`#FFFFFF`): modal and main content surfaces.
- **Muted Surface** (`#F4F4F5`): secondary panels and muted controls.
- **Input Surface** (`#F4F6F8`): filled select and settings input backgrounds.
- **Border Neutral** (`#E4E4E7`): dividers, field borders, and panel edges.
- **Muted Ink** (`#71717A`): secondary labels and low-emphasis text.

### Semantic

- **Success Green** (`#039855`): verification success and confirmed identity.
- **Danger Red** (`#F04438`): destructive actions and irreversible warnings.

## 3. Typography

Display and body use a system sans stack through Chakra and Sealos UI tokens.
Product screens should stay on fixed, compact sizes rather than fluid hero type.

### Hierarchy

- **Title** (600, 16-20px): modal titles, settings group titles, workspace names.
- **Body** (500, 14px): labels, settings values, and list text.
- **Helper** (400-500, 11-12px): warnings, table metadata, and compact hints.

## 4. Elevation

Depth is mostly structural: borders, background layers, and modal overlays carry
the hierarchy. Avoid decorative shadows. Modals use the existing Chakra overlay
and subtle radius; inline settings should remain flat.

## 5. Components

### Buttons

- **Shape:** 4px radius by default, matching the Chakra button override.
- **Primary:** charcoal background with white text for important confirmations.
- **Ghost/outline:** muted gray backgrounds for settings actions, red text for
  destructive actions.
- **States:** loading and disabled states should be explicit when API mutations
  are in flight.

### Inputs / Fields

- **Style:** settings inputs use `SettingInputGroup` with 6px radius, neutral
  border, and muted field background.
- **Focus/Error:** rely on Chakra form-control state and existing component
  vocabulary; do not invent per-feature field styling.

### Modals

- **Style:** centered, compact, neutral header, 10-12px radius.
- **Behavior:** destructive modals must keep clear warning copy and require
  typed confirmation unless the user is blocked from the action entirely.

### Workspace Controls

- **Private workspace:** render with the localized personal workspace label and
  hide rename/dissolve/abdicate controls.
- **Team workspace:** owner and manager actions can use the established icon and
  outline button vocabulary.

## 6. Do's and Don'ts

### Do:

- **Do** keep authenticated screens compact, quiet, and task-first.
- **Do** use localized strings for every visible account and workspace label.
- **Do** update both UI affordances and backend API guards for destructive
  account actions.
- **Do** reuse `ConfigItem`, `SettingInputGroup`, and existing Chakra variants
  inside account settings.

### Don't:

- **Don't** use landing-page heroes, decorative gradients, or glass effects in
  settings and workspace management surfaces.
- **Don't** expose controls that cannot work because the backend behavior is
  fixed, such as renaming the private personal workspace.
- **Don't** rely on frontend-only hiding for account deletion or other dangerous
  actions.
- **Don't** add a new visual vocabulary when an existing Sealos UI component
  already covers the interaction.
