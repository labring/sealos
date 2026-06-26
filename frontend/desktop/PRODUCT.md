# Product

## Register

product

## Users

Sealos Desktop is used by developers, platform operators, and cloud tenants who
need to launch apps, switch workspaces, manage identity settings, and inspect
cloud resources from an authenticated browser desktop.

## Product Purpose

The product gives Sealos users one operational home for app launch, account
management, workspace collaboration, billing-related entry points, and platform
configuration. Success means users can complete routine cloud operations without
leaving the desktop shell or guessing which region, workspace, or identity is in
effect.

## Brand Personality

Quiet, capable, and work-focused. The interface should feel like a dependable
operations surface rather than a marketing page or decorative dashboard.

## Anti-references

Avoid landing-page composition inside authenticated surfaces, oversized hero
sections, decorative gradients, glass effects, noisy cards, and unfamiliar
controls for standard account or workspace tasks.

## Design Principles

- Make authority visible: users should always understand the active workspace,
  region, account identity, and irreversible actions.
- Prefer familiar product controls: buttons, dialogs, inputs, lists, tabs, and
  menus should behave predictably.
- Keep dangerous actions gated twice: frontend affordances reduce mistakes, but
  backend APIs remain the authority.
- Preserve configured branding while separating it from hardcoded product
  invariants such as the private personal workspace.
- Optimize for repeated work: compact settings, stable labels, and low visual
  noise matter more than novelty.

## Accessibility & Inclusion

Use clear text labels, visible focus states from the Chakra system, sufficient
contrast for status messages, and localized strings for user-facing copy. Motion
should be restrained and should communicate state rather than decorate.
