---
name: Sealos App Launchpad
description: Operational product UI for deploying and managing Kubernetes applications in Sealos.
colors:
  accent-blue: "#2563EB"
  action-blue: "#219BF4"
  text-strong: "#111824"
  text-muted: "#485264"
  border-subtle: "#E8EBF0"
  surface-base: "#FBFBFC"
  surface-muted: "#F7F8FA"
  surface-control: "#F4F4F7"
  success-teal: "#00A9A6"
  chart-blue: "#3293EC"
  chart-purple: "#8172D8"
  warning-bg: "#FFFAEB"
typography:
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.35
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  popover: "12px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  page: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent-blue}"
    textColor: "#FBFBFC"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  control-field:
    backgroundColor: "#FBFBFC"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Sealos App Launchpad

## 1. Overview

**Creative North Star: "Operations Console"**

Launchpad is a product interface for people already trying to complete operational work. It should be quiet, familiar, and dense enough to support repeated create/edit/debug loops. The visual system uses white panels, muted gray separators, compact controls, and blue only when it marks a primary action, active state, guide overlay, or selected control.

The UI should not drift into landing-page composition, decorative gradients, oversized metrics, or novelty controls. Forms, tables, tabs, popovers, modals, logs, and charts should feel consistent with the rest of Sealos Desktop.

**Key Characteristics:**

- Compact, panel-based product surfaces.
- 8px-or-smaller card radii for repeated operational content.
- Blue accents for action and current state, not decoration.
- Explicit status and validation language near the affected control.

## 2. Colors

The palette is restrained: cool neutrals carry most surfaces, with blue accents and a small chart/status vocabulary.

### Primary

- **Guide Blue** (`#2563EB`): guide overlays, active highlights, and strong primary emphasis.
- **Action Blue** (`#219BF4`): selected form chips, focus rings, and interactive choice states.

### Secondary

- **Chart Blue** (`#3293EC`): monitoring series and chart legends.
- **Chart Purple** (`#8172D8`): secondary monitoring series and status accents.
- **Success Teal** (`#00A9A6`): success or healthy chart/status signals.

### Neutral

- **Ink** (`#111824`): primary text and selected date states.
- **Slate Text** (`#485264`): table headers, secondary copy, and inactive labels.
- **Soft Border** (`#E8EBF0`): select, popover, chart, and panel borders.
- **Canvas** (`#FBFBFC`): base content background.
- **Muted Row** (`#F7F8FA`): table headers and light list surfaces.
- **Control Fill** (`#F4F4F7`): date range, inactive control, and subtle background fills.

### Named Rules

**The Operational Restraint Rule.** Blue is for action, active state, guide focus, or chart data. Do not use it as ornamental background.

## 3. Typography

**Display Font:** system UI sans-serif
**Body Font:** system UI sans-serif
**Label/Mono Font:** system UI sans-serif, with monospace only for YAML/code/log content when already present

**Character:** Native product typography. The interface should feel fast and unsurprising on Linux, macOS, and Windows.

### Hierarchy

- **Title** (600, 16px, 1.35): panel headers, monitor headings, and section labels.
- **Body** (400, 14px, 1.5): form help, table content, descriptions, and modal body copy.
- **Label** (500, 12px, 1.35): compact controls, date picker labels, table headers, status metadata, and chart captions.
- **Small** (400-500, 11px-12px): chart legends, secondary counts, and dense operational hints.

### Named Rules

**The Native Console Rule.** Use one sans-serif product stack; do not introduce display fonts, decorative letter spacing, or fluid hero type inside this provider.

## 4. Elevation

Launchpad is mostly flat at rest. Depth is conveyed through panel grouping, borders, tonal backgrounds, and small gaps. Popovers and dropdowns use restrained shadows only when they must float over dense controls.

### Shadow Vocabulary

- **Popover Shadow** (`0px 4px 10px 0px rgba(19, 51, 107, 0.10), 0px 0px 1px 0px rgba(19, 51, 107, 0.10)`): select menus and compact overlays.
- **Chart Tooltip Shadow** (`0px 24px 48px -12px rgba(19, 51, 107, 0.2), 0px 0px 1px 0px rgba(19, 51, 107, 0.2)`): chart tooltip containers only.

### Named Rules

**The Flat-By-Default Rule.** Do not add shadows to ordinary cards or panels. Reserve elevation for floating controls.

## 5. Components

### Buttons

- **Shape:** rounded rectangles around 8px for primary actions; compact icon buttons can be circular or 50%.
- **Primary:** blue background with white text where the action commits or advances a flow.
- **Hover / Focus:** use subtle tonal fills or a blue focus ring. Preserve visible focus treatment.
- **Secondary / Ghost:** gray text and transparent or muted backgrounds for repeated toolbar actions.

### Chips

- **Style:** selected chips use pale blue fill, blue border, and blue text. Unselected chips use a soft border and neutral text.
- **State:** selected, unselected, disabled, and error states must remain distinguishable without color alone when the meaning is important.

### Cards / Containers

- **Corner Style:** 8px for app/detail panels; 4px to 6px for dense table and control interiors.
- **Background:** white or canvas surfaces with `#E8EBF0`/`#F0F1F6` borders and row separators.
- **Shadow Strategy:** flat at rest.
- **Internal Padding:** compact 8px to 16px rhythm, with 20px page gutters where the layout needs breathing room.

### Inputs / Fields

- **Style:** white or canvas background, 1px soft border, 6px to 8px radius, 12px-14px text.
- **Focus:** blue ring or border shift with enough contrast to see in dense forms.
- **Error / Disabled:** error copy stays adjacent to the affected field; disabled controls should visibly reduce contrast and pointer affordance.

### Navigation

- **Style:** predictable product navigation through pages, tabs, detail layout, and route query state.
- **Active State:** use icon/text color and muted fills rather than decorative bars.

### Operational Charts

Use consistent chart colors for CPU, memory, storage, and network series. Tooltips should be legible, bordered, and floating; chart legends should remain compact.

## 6. Do's and Don'ts

### Do:

- **Do** keep repeated operational cards at 8px radius or less.
- **Do** use tables, segmented controls, tabs, and compact form sections for scan-heavy workflows.
- **Do** surface permission, quota, domain, and Kubernetes ownership conflicts near the workflow that triggered them.
- **Do** preserve YAML and API details for operators who need exact cluster state.

### Don't:

- **Don't** make Launchpad look like a landing page with hero sections, decorative gradients, or oversized metrics.
- **Don't** use blue, purple, or chart colors as generic decoration.
- **Don't** hide actionable infrastructure failures behind generic "server error" copy when a specific matcher exists.
- **Don't** add nested cards or floating decorative panels inside already framed app/detail panels.
