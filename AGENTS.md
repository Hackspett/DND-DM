# Agent instructions

## Source organization

- Keep feature-owned pages, components, hooks, utilities, types, and assets
  together under `src/features/<feature>/`.
- Put code in `src/shared/` only when it is genuinely reusable across multiple
  features. Do not move feature-specific code into `shared` for convenience.
- When code becomes useful to multiple features, move it to `shared` and update
  its imports consistently.

## UI components

- Prefer Mantine components for controls, layout, feedback, and other UI
  primitives whenever they fit the requirement.
- Before creating a custom component, consider whether Mantine already provides
  the needed behavior and whether its component can be configured or composed
  instead. Add custom UI only when it provides needed behavior or presentation
  that Mantine does not reasonably cover.
- Keep a small component in the file where it is used when that keeps the file
  clear and within the size guideline. Otherwise, give it its own focused file.
- Do not use generic component-collection files such as
  `BattlePageComponents.tsx`. Keep unrelated components separate; group
  components only when they are tightly related, such as a set of shared title
  variants in `titles.component.tsx`.

## File naming

- Use the pattern `<descriptive-name>.<kind>.<extension>` when a file has a
  clear role, for example `clock.component.tsx` or `helper.utils.ts`.
- Common kinds include `component`, `hook`, `utils`, `types`, `constants`,
  `actions`, `service`, `api`, `context`, `provider`, `store`, `schema`,
  `styles`, `test`, and `spec`. Keep conventional entry points and declaration
  files (such as `main.tsx` and `vite-env.d.ts`) recognizable.
- Choose a specific, descriptive name and avoid generic catch-all filenames.

## File size and decomposition

- Aim to keep source files below roughly 400 lines.
- When a file approaches or exceeds that size, consider extracting cohesive
  components, hooks, utilities, or types into focused modules.
- Keep extracted feature-specific modules in that feature's folder; use
  `src/shared/` only for cross-feature code.
- Treat the line count as a guideline, not a reason to create tiny wrappers or
  split code that is clearer and more maintainable together. Preserve clear
  ownership and behavior when refactoring.
