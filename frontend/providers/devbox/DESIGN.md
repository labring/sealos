# Devbox Design Notes

Devbox is an operational product surface, not a marketing page. The interface
should be compact, predictable, and optimized for repeated configuration and
inspection.

## UI Principles

- Preserve the existing card and form structure when tuning layout. Prefer small
  spacing and sizing improvements over broad redesigns.
- Keep status values in English unless the task explicitly asks for localization.
- Use concrete feedback for asynchronous actions. A button that validates or
  mutates state must show loading, success, and failure states.
- Error copy should explain what the user can do next. Raw infrastructure
  errors can appear only as fallback detail, not as the primary message.
- Keep dense configuration controls aligned and stable. Labels, buttons, and
  dynamic text should not resize the surrounding network/resource form rows.
- Use `sonner` toasts for current provider UI feedback unless a component is
  already bound to a different established local pattern.

## Custom Domain UX

The custom domain drawer is a validation step inside the larger DevBox edit
form. A successful validation does not persist the Kubernetes network change by
itself, so the success feedback must tell the user to save the outer form.

DNS failure messages should use product language:

- domain not found
- CNAME record missing
- CNAME target mismatch
- timeout
- network unreachable

Avoid exposing raw `queryCname ENOTFOUND` or `queryCname ENODATA` as the only
visible explanation.
