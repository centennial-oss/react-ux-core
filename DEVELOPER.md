# Developer Setup

react-ux-core is a TypeScript React component library built on React Aria Components and Tailwind CSS v4. It's built
with Vite, documented in Storybook, tested in real browsers with Vitest and Playwright, and published to npm as ES
modules with type declarations.

## Requirements

- Node.js 24 (`nvm use` picks up `.nvmrc`) and npm 11
- [Docker](https://www.docker.com/), for the visual snapshot tests (`make test-visual`, part of `make check`)

## Getting Started

```sh
make developer-setup   # one time: npm ci, then download the browser the tests run in
make storybook         # browse and try the components
make check-changed     # while you work: the gates, limited to what your changes reach (minutes)
make ci                # before a pull request: commit, then every gate as CI runs it (about an hour)
```

The full suite takes about an hour, so while you work, `make check-changed` runs only what your changes reach:
formatting and ESLint on the files you changed, the type check, the generated-docs and baseline checks, the unit
and story tests that import a changed file, and the visual snapshots of the stories that do. "Your changes" are the
commits since your branch left `main` (on `main`, none) plus staged, unstaged and untracked files; `BASE=next` compares
with another branch. A change to something everything depends on (Storybook's config, the global styles, test setup,
dependencies, build config) runs everything.

`make check` runs every gate on your working tree, so files you've generated or recorded but not committed (the props
glossary, the components catalog, visual baselines) pass locally and then fail in CI. `make ci` closes that gap: it
fails unless everything is committed, reinstalls the locked dependencies, runs every gate with CI's settings
(`CI=true`, so a stray `.only` fails), and fails if any gate changed or added a file. If `make ci` passes, CI will.

npm 11 doesn't run dependency install scripts unless they're approved. None are needed here, so leave them
unapproved.

## Makefile Targets

| Target                          | Description                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `make developer-setup`          | One-time setup: check for npm, install dependencies and the test browser          |
| `make install`                  | Install dependencies (`npm ci`)                                                   |
| `make storybook`                | Start Storybook on port 6006, reachable from other devices on your network        |
| `make build`                    | Build `dist/`: ES modules, type declarations and `styles.css`                     |
| `make dev`                      | Rebuild `dist/` on change (for co-developing with an app)                         |
| `make link` / `make unlink`     | Make this checkout linkable from a consumer app, or undo it                       |
| `make pack`                     | Write the package tarball, as published, to `PACK_DIR` (run `build` first)        |
| `make test`                     | Unit tests (phone, tablet, desktop) and story tests (light, dark, high contrast)  |
| `make test FILTER=…`            | Only matching test files, e.g. `FILTER=ComboBox` (also for `test-watch`)          |
| `make test-changed`             | Only the unit and story tests that import a file you changed                      |
| `make test-watch`               | Tests in watch mode                                                               |
| `make lint`                     | ESLint and the project's convention rules; also fails if a generated doc is stale |
| `make lint-changed`             | ESLint on the files you changed                                                   |
| `make typecheck`                | TypeScript                                                                        |
| `make format`                   | Format with Prettier                                                              |
| `make format-check`             | Check formatting without writing                                                  |
| `make format-check-changed`     | Check formatting of the files you changed                                         |
| `make storybook-build`          | Build the static Storybook into `storybook-static/`                               |
| `make test-visual`              | Visual snapshots of every story, in Docker (run `storybook-build` first)          |
| `make test-visual-changed`      | Visual snapshots of the stories you changed and stories missing a baseline        |
| `make update-snapshots`         | Re-record every visual baseline, in Docker (run `storybook-build` first)          |
| `make update-snapshots-changed` | Record baselines for the stories you changed and stories missing one              |
| `make snapshots-check`          | In seconds: every story has a committed baseline and every baseline a story       |
| `make props-glossary`           | Regenerate `docs/PROPS-GLOSSARY.md` from the components' prop types               |
| `make catalog`                  | Regenerate `docs/COMPONENTS-CATALOG.md` from the stories                          |
| `make count-components`         | Count exported components per entry point (`LIST=1` names them)                   |
| `make size`                     | Bundle-size budgets (run `build` first)                                           |
| `make licenses`                 | Check runtime dependency licenses                                                 |
| `make pack-check`               | Check what would be published to npm (run `build` first)                          |
| `make check-changed`            | While you work: the gates, limited to what your changes reach                     |
| `make check`                    | Every gate CI runs, quick ones first, on your working tree                        |
| `make committed-check`          | Fail if anything in the working tree isn't committed                              |
| `make ci`                       | Before pushing: everything committed, then `install` and `check` as CI runs them  |
| `make changeset`                | Describe a change for the changelog                                               |
| `make set-release-version`      | Apply pending changesets (version bump and changelog) without committing          |
| `make prerelease-enter`         | Start prerelease mode on the `next` branch (`make prerelease-exit` ends it)       |
| `make tag-release`              | Release: bump, commit, tag and push (see [Releasing](#releasing))                 |
| `make clean`                    | Remove build and test output                                                      |

Each target wraps an npm script or a script in `scripts/`, so CI and people run the same commands. Use the targets
rather than the commands behind them: those can change, the targets won't.

## Storybook

`make storybook` opens Storybook in your browser. Every component has a page with all its variants and states, and
an interactive playground (the Controls panel). The toolbar switches the **theme** (light, dark, high contrast,
system) and the **viewport** (phone, tablet and desktop sizes). The Accessibility panel shows axe
results for the current story.

To try components on a real phone or tablet, connect it to the same Wi-Fi and open
`http://<your Mac's local IP>:6006` (System Settings → Wi-Fi → Details shows the IP). Use
`make storybook STORYBOOK_HOST=localhost` to keep Storybook private to your machine on untrusted networks.

## Tests

| Layer    | What runs                                                                                  | Where              |
| -------- | ------------------------------------------------------------------------------------------ | ------------------ |
| Unit     | `src/**/*.test.tsx` in Chromium at desktop, tablet (touch) and phone (touch, mobile) sizes | `make test`        |
| Stories  | Every story renders and passes axe, once per theme (light, dark, high contrast)            | `make test`        |
| Contrast | Every token pair meets WCAG AA (AAA text in high contrast) in each theme                   | `make test`        |
| Visual   | Screenshots of every story at phone, tablet and desktop sizes, light and dark              | `make test-visual` |

- Unit tests use [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) queries and
  `userEvent` from `vitest/browser`, which drives the real browser. `commands.tap(selector)` performs a real touch tap
  on the touch-enabled instances; `test/axe.ts` provides `expectNoAxeViolations`.
- Visual baselines live in `test/visual/__snapshots__/`, one per story, theme (light, dark) and screen size (phone,
  tablet, desktop), and are always made in Playwright's Linux Docker image, so they match CI. A new story needs its
  six baselines committed with it, and a changed story needs its baselines updated. Run
  `make storybook-build update-snapshots-changed` (it records only the stories your changes reach and the ones missing
  a baseline), review the new and changed images (`git status` lists them), and commit them. `make update-snapshots`
  re-records everything, which takes most of an hour. `make snapshots-check` (an early gate in `make check`) fails in
  seconds if a baseline is missing, left over from a removed story, or not added to git. Stories tagged `!visual` are
  skipped; use that for behaviour demos (controlled examples, timers) that look the same as another story.
- `docs/PROPS-GLOSSARY.md` and `docs/COMPONENTS-CATALOG.md` are generated. After changing a component's props or a
  story's description, run `make props-glossary catalog` and commit the result; `make lint` fails while they're stale.
- Browser tests are heavy, so local runs are capped: at most 4 test files at once in Vitest (`TEST_WORKERS`), unit
  tests before story tests, and the visual container limited to 4 CPUs and 4 GB with 4 Chromium workers
  (`DOCKER_CPUS`, `DOCKER_MEMORY`, `VISUAL_WORKERS`). Raise or lower them to suit your machine, for example
  `TEST_WORKERS=8 make test` or `make test-visual DOCKER_CPUS=8 DOCKER_MEMORY=8g VISUAL_WORKERS=8`. CI uses each
  tool's defaults.
- Size budgets (`.size-limit.json`, `make size`) count what an entry point loads up front, minified and brotlied with
  its dependencies (`"entry": "index"`). Code a component loads on demand with a dynamic import (pdf.js, Spreadsheet's
  parts, ConfigForm's rarer inputs, DataTable's bulk-action bar) isn't counted. Set a new or changed budget to the
  measured size plus 250 B, rounded up to the next 250 B.

### Testing Tips

Real browsers and React Aria have a few behaviours worth knowing before writing interaction tests:

- Overlays animate, and on phones they're sheets that slide in: wait with `expect.poll(...)` (for example for focus
  to move inside a dialog) instead of fixed delays.
- On touch devices React Aria reveals a combo box's list only after the on-screen keyboard settles, and it doesn't
  open lists from arrow keys on mobile user agents. Wait for the popover to be visible, and keep keyboard tests on
  the desktop instance.
- While a combo box list is open, React Aria hides everything except the input and the list from assistive
  technology, so close it (Escape) before querying other elements by role.
- React Aria builds collections by rendering children once in a hidden copy. Query options inside the visible
  `listbox`; if Playwright reports an option as "not stable", click with `{ force: true }`.
- Opening a menu with the mouse focuses the menu; focusing the trigger and pressing Enter focuses the first item.
- Collapsed disclosure panels use `hidden="until-found"`: check visibility with `element.checkVisibility()`.
- Vitest's built-in `toHaveTextContent` compares the whole text; use `expect(el.textContent).toContain(...)` for
  partial matches.
- Playwright won't click `aria-disabled` elements; use `{ force: true }` to prove a press is ignored.
- `userEvent.clear` presses Backspace, which some inputs treat as an action (MultiSelect removes its last chip).

## Project Layout

```
src/
  components/   One directory per component: Component.tsx, .styles.ts, .test.tsx, .stories.tsx, index.ts
  form/         The /form entry: ConfigForm on TanStack Form, field renderers (fields/), containers
                (containers/), validation, value and upload helpers; index.ts is its public API
  table/        The /table entry: DataTable on TanStack Table, TableToolbar, filters, cells, CSV
  chart/        The /chart entry: TimeSeriesChart, CategoryChart, HourOfDayChart (Chart.js) and Gauge (SVG)
  shell/        The /shell entry: AppShell, Sidebar, Header, Brand, menus, HierarchyPicker, Page, bars, Footer
  map/          The /map entry: Map on MapLibre GL, with React-drawn markers, clusters and a places list
  dashboard/    The /dashboard entry: Dashboard, its grid, widget frames and runtime; widget types that need optional
                peers live in its chart/, table/, map/ and markdown/ folders (the /dashboard/* entries)
  code/ codes/ diff/ logs/ media/ graph/ canvas/ chat/ finance/ dicom/ 3d/ editor/ terminal/ music/ math/ markdown/
                The other entries, one folder each, named as imported (/code, /codes, …)
  provider/     UIProvider, contexts and hooks, messages, theme, link component
  styles/       Design tokens, themes, utilities and base styles (built into dist/styles.css)
  utils/        Internal helpers
  index.ts      Public API of the main entry: everything consumers can import
test/           Test setup, helpers and visual snapshot tests (visual/, with the baselines in visual/__snapshots__/)
scripts/        Build, generate and check scripts (CSS build, docs generators, license, package and baseline
                checks, tag-release)
.storybook/     Storybook configuration
.changeset/     Pending changesets
.github/        Workflows and their scripts
```

## Guidelines

- Build behaviour on React Aria Components; never make a clickable `div`. Every interactive element must work with a
  keyboard, show a visible focus ring, and meet WCAG 2.2 AA in every theme.
- A component isn't done until it works at 360 px wide with touch: touch targets of at least `--hit-size` (use the
  `hit-area` utility), nothing that needs hover, and no horizontal page scroll.
- Use the semantic colour tokens (`bg-surface-2`, `text-fg-muted`, `bg-danger-solid`), never Tailwind's raw palette.
  ESLint enforces this.
- Keep the API consistent: `onX` events, `isX` / `hasX` booleans, `variant` × `tone` × `size` for appearance, inputs
  that take `value` / `defaultValue` / `onChange(value)`, one `className`, icons passed as components, refs forwarded
  to the root element, and `data-*` / `aria-*` attributes passed through.
- No hard-coded user-facing text: add strings to the `messages` object. ESLint flags literal text in components.
- No app state: no routing, data fetching or storage in the library. Apps pass behaviour in through `UIProvider` and
  callbacks.
- Export public components, hooks and types from `src/index.ts`. Anything not exported there is private.
- Write Tailwind classes as complete static strings (for example in a lookup table). Tailwind finds classes by
  scanning the built files, so `bg-${tone}-solid` would never be generated.
- Keep `react`, `react-dom`, `react-aria-components` and `lucide-react` as peer dependencies. Add runtime dependencies
  only when there is a clear need; `make licenses` and `make size` check them.
- Add a changeset (`make changeset`) to every pull request that changes behaviour.
- Run `make check-changed` while you work, then commit and run `make ci` before opening a pull request.

## Releasing

Nothing is published to npm unless a `vX.Y.Z` tag is pushed. Version bumps and the changelog come from
[Changesets](https://github.com/changesets/changesets).

1. Optionally run **Release Preflight** from the repository's Actions tab. It runs the whole release as a dry run and
   uploads the package, Storybook and the assembled docs site as workflow artifacts.
2. On an up-to-date `main` with a clean working tree, run:

   ```sh
   make tag-release
   ```

   It works out the next version from the pending changesets, runs `make ci`, asks for confirmation, then runs
   `changeset version`, commits `Release vX.Y.Z`, tags it, and pushes `main` and the tag to `upstream`. Try
   `DRY_RUN=1 make tag-release` first to see every step. `REMOTE=origin` changes the remote.

3. The tag push starts **Release**. It reruns every gate, publishes the verified package to npm with provenance,
   creates the GitHub release from the changelog, and adds the version to the Storybook site.

Prereleases come from the `next` branch: `make prerelease-enter` there, then release as usual. Versions like
`1.1.0-next.0` publish to npm's `next` tag and to the site's `/next/` folder. `make prerelease-exit` ends
prerelease mode before the stable release.

### One-time Setup (maintainer)

- npm: the `centennial-oss` org with at least two owners using 2FA, and a trusted publisher for this package naming
  the GitHub repository `centennial-oss/react-ux-core` and the workflow `release.yml`. npm only lets you add a trusted
  publisher to a package that already exists, so the first version is published by hand, once:
  1. `npm login`, as an owner of the org, with Node 24 (`nvm use`).
  2. On a clean, up-to-date `main` at version `0.0.0`: `make install build pack-check`, then
     `npm publish --access public --provenance=false`. Provenance can only be made in CI, so it's off for this one
     publish. `npm publish --dry-run` first shows exactly what will be published.
  3. On npmjs.com, under the package's **Settings**, add a GitHub Actions **Trusted Publisher**: organization
     `centennial-oss`, repository `react-ux-core`, workflow `release.yml` (not `release-build.yml`: npm checks the
     workflow the tag push started) and no environment. Then set **Publishing access** to require 2FA and disallow
     tokens; trusted publishing still works.
  4. Optionally, `npm deprecate @centennial-oss/react-ux-core@0.0.0 "Bootstrap publish; use a later release"`. The
     first real release moves the `latest` tag off it.
- GitHub: a tag ruleset so only maintainers can create `v*` tags; private vulnerability reporting turned on (for
  `SECURITY.md`); a `gh-pages` branch (a placeholder is fine; the first release replaces it) with Pages set to
  "Deploy from a branch: `gh-pages` / (root)"; and the custom domain `ccux.centennialoss.org`, verified for
  the organization, with HTTPS enforced. The deploy writes the domain to `CNAME` on every release.

## Co-developing with a Consumer App

Consumer apps pin exact versions of this package. To try unreleased changes in an app:

- Run `make link` here and `npm link @centennial-oss/react-ux-core` in the app (or use a `file:` dependency in an
  **uncommitted** override), then run `make dev` here so `dist/` rebuilds on change. `make unlink` undoes the link.
- Or `make build pack` and install the tarball in the app, to test exactly what would be published.
- Or install a prerelease from the `next` npm dist-tag.

Never commit a local path dependency to a consumer app.

### Linked checkouts: one copy of React

A linked or `file:` install brings this checkout's own `node_modules` along, so the app ends up with two copies of
React and React Aria. At run time that breaks hooks and context; in TypeScript the two `@types/react` copies clash
(for example, the library's `Ref` isn't assignable to the app's, so a `LinkComponent` fails to type-check). Point both
at the app's copies.

In the app's `vite.config.ts`, have Vite resolve the shared peers once:

```ts
export default defineConfig({
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'react-aria-components',
      'react-aria',
      'react-stately',
      'lucide-react',
    ],
  },
});
```

In the app's `tsconfig` (the one with `compilerOptions` for its source), map the React types to the app's copies:

```json
{
  "compilerOptions": {
    "paths": {
      "react": ["./node_modules/@types/react"],
      "react/*": ["./node_modules/@types/react/*"],
      "react-dom": ["./node_modules/@types/react-dom"],
      "react-dom/*": ["./node_modules/@types/react-dom/*"]
    }
  }
}
```

Add any optional peer the app uses from the library (`chart.js`, `@tanstack/react-table`, …) to `dedupe` too. Remove
both once the app installs a published version.
