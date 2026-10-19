.PHONY: developer-setup install build dev link unlink pack test test-changed test-watch lint lint-changed typecheck \
	format format-check format-check-changed storybook storybook-build test-visual test-visual-changed snapshots-check \
	update-snapshots update-snapshots-changed size licenses pack-check props-glossary props-glossary-check \
	count-components catalog catalog-check check check-changed committed-check ci changeset set-release-version \
	prerelease-enter prerelease-exit tag-release clean

# Playwright's Linux image for visual snapshots, so baselines match everywhere. Keep the tag in step with
# @playwright/test.
PLAYWRIGHT_IMAGE ?= mcr.microsoft.com/playwright:v1.64.1-noble
# Storybook dev server: 0.0.0.0 makes it reachable from phones on the same network; use localhost to keep it local.
STORYBOOK_HOST ?= 0.0.0.0
STORYBOOK_PORT ?= 6006
# Visual tests run in Docker by default; CI sets VISUAL_RUNNER=native because its job already runs in the image.
VISUAL_RUNNER ?= docker
# Resource caps for the visual test container and its Chromium workers, so a run doesn't take over the machine.
DOCKER_CPUS ?= 4
DOCKER_MEMORY ?= 4g
VISUAL_WORKERS ?= 4
DOCKER_RUN = docker run --rm --init --ipc=host --cpus=$(DOCKER_CPUS) --memory=$(DOCKER_MEMORY) \
	-e VISUAL_WORKERS=$(VISUAL_WORKERS) -e VISUAL_STORIES_FILE -e CI -v "$(CURDIR)":/work -w /work $(PLAYWRIGHT_IMAGE)
PLAYWRIGHT = $(if $(filter native,$(VISUAL_RUNNER)),,$(DOCKER_RUN)) npx playwright test
# Limits test and test-watch to matching test files, e.g. FILTER=ComboBox or FILTER=src/form.
FILTER ?=
# Where pack writes the package tarball.
PACK_DIR ?= .
# The *-changed targets check only what your changes reach: changes committed since this branch left BASE (on BASE
# itself, none), plus staged, unstaged and untracked files. See scripts/changes.mjs.
BASE ?= main
SINCE = $(shell git merge-base HEAD $(BASE) 2> /dev/null || git rev-parse HEAD)
CHANGED_FILES = $(shell node scripts/changes.mjs $(SINCE))
# Where the *-changed visual targets list the stories to capture.
VISUAL_SELECTION = .cache/visual-stories.json

# Checks a generated doc: runs generator $(1) into a temp file and fails if tracked file $(2) differs, telling the
# user to run `make $(4)` to sync $(3). Generators take --out and --quiet (see scripts/ts-program.mjs).
define check-generated
	@tmp=$$(mktemp); trap 'rm -f "$$tmp"' EXIT; \
	node $(1) --quiet --out "$$tmp" && \
	if ! diff -u $(2) "$$tmp"; then \
		echo "error: $(3) ($(2)) is out of sync with the code. Run 'make $(4)' to sync it." >&2; \
		exit 1; \
	fi
endef

# One-time setup: check for npm and npx, install dependencies, then download the browser the tests run in. Uses the
# project's own Playwright (installed by npm ci), so the browser matches its version.
developer-setup:
	@missing=""; \
	for cmd in npm npx; do command -v $$cmd > /dev/null 2>&1 || missing="$$missing $$cmd"; done; \
	if [ -n "$$missing" ]; then \
		echo "error: not found on your PATH:$$missing" >&2; \
		echo "Install Node.js 24 (it includes npm and npx) first, either:" >&2; \
		echo "  - directly, from https://nodejs.org/en/download" >&2; \
		echo "  - or with nvm (https://github.com/nvm-sh/nvm): run 'nvm install' here; it reads .nvmrc" >&2; \
		echo "Then run make developer-setup again." >&2; \
		exit 1; \
	fi
	@$(MAKE) --no-print-directory install
	npx playwright install chromium

install:
	npm ci

build:
	npm run build

dev:
	npm run dev

# Make this checkout linkable from a consumer app (then run `npm link @centennial-oss/react-ux-core` there).
link:
	npm link

unlink:
	npm unlink --global @centennial-oss/react-ux-core

# The package tarball exactly as it would be published, to install in a consumer app. Run build first.
pack:
	mkdir -p $(PACK_DIR)
	npm pack --ignore-scripts --pack-destination $(PACK_DIR)

test:
	npm test -- $(FILTER)

# Only the unit and story tests your changes reach; all of them if a change reaches everything.
test-changed:
	node scripts/test-changed.mjs $(SINCE)

test-watch:
	npm run test:watch -- $(FILTER)

# Also fails if the props glossary or controls catalog is stale (checked first, as they're quick), then prints the
# component count, so everyday make usage shows it.
lint: props-glossary-check catalog-check
	npm run lint
	@$(MAKE) --no-print-directory count-components

# ESLint on the files you changed.
lint-changed:
	$(if $(CHANGED_FILES),npx eslint --no-warn-ignored $(CHANGED_FILES))

typecheck:
	npm run typecheck

format:
	npm run format

format-check:
	npm run format:check

# Prettier on the files you changed.
format-check-changed:
	$(if $(CHANGED_FILES),npx prettier --check --ignore-unknown $(CHANGED_FILES))

storybook:
	npx storybook dev --port $(STORYBOOK_PORT) --host $(STORYBOOK_HOST)

storybook-build:
	npm run storybook:build

# Visual snapshots of every story at phone, tablet and desktop sizes, in light and dark. Run storybook-build
# first; `make check` does.
test-visual:
	$(PLAYWRIGHT)

# Visual snapshots of only the stories your changes reach and the stories missing a baseline (all of them if a change
# reaches everything). Run storybook-build first.
test-visual-changed:
	node scripts/select-visual-stories.mjs $(SINCE) $(VISUAL_SELECTION)
	VISUAL_STORIES_FILE=$(VISUAL_SELECTION) $(PLAYWRIGHT) --pass-with-no-tests

# Fails, in seconds, if a story has no visual baseline, a baseline has no story, or a baseline isn't added to git.
# Run storybook-build first; `make check` does.
snapshots-check:
	node scripts/check-snapshots.mjs

# Re-record every visual baseline, then review the changed images and commit them. Run storybook-build first. To
# record new stories' baselines or the ones your changes affect, update-snapshots-changed is much quicker.
update-snapshots:
	$(PLAYWRIGHT) --update-snapshots

# Record the baselines of the stories your changes reach and the stories missing one, then review the images and
# commit them. Run storybook-build first.
update-snapshots-changed:
	node scripts/select-visual-stories.mjs $(SINCE) $(VISUAL_SELECTION)
	VISUAL_STORIES_FILE=$(VISUAL_SELECTION) $(PLAYWRIGHT) --update-snapshots --pass-with-no-tests

# Bundle-size budget per entry point. Run build first.
size:
	npx size-limit

# Runtime dependencies must use Apache-2.0-compatible licenses.
licenses:
	node scripts/check-licenses.mjs

# Only dist/, LICENSE, NOTICE, README.md and package.json may be published. Run build first.
pack-check:
	node scripts/check-pack.mjs

# Regenerate docs/PROPS-GLOSSARY.md from the exported components' prop types. Variance judgements live in
# scripts/props-glossary.json; the script warns about shared prop names that aren't reviewed there yet.
props-glossary:
	npm run props-glossary

# Fails if docs/PROPS-GLOSSARY.md doesn't match the components' prop types; `make lint` runs it.
props-glossary-check:
	$(call check-generated,scripts/props-glossary.mjs,docs/PROPS-GLOSSARY.md,the props glossary,props-glossary)

# How many components the package exports, per entry point. LIST=1 also names them.
count-components:
	@node scripts/count-components.mjs $(if $(LIST),--list)

# Regenerate docs/COMPONENTS-CATALOG.md: one paragraph per Storybook Docs page, in Storybook's sections.
catalog:
	node scripts/controls-catalog.mjs

# Fails if docs/COMPONENTS-CATALOG.md doesn't match the stories; `make lint` runs it.
catalog-check:
	$(call check-generated,scripts/controls-catalog.mjs,docs/COMPONENTS-CATALOG.md,the controls catalog,catalog)

# Every gate CI runs. Run this before calling work done. The quick gates come first (formatting, the generated docs
# and the visual baselines), so a run that's bound to fail does so in a couple of minutes, not after the slow tests.
check: format-check props-glossary-check catalog-check storybook-build snapshots-check lint typecheck test build size \
	licenses pack-check test-visual

# The quick loop while you work: the gates, limited to what your changes reach, in minutes rather than an hour. Before
# a pull request, run `make ci` (every gate, as CI runs them).
check-changed: format-check-changed props-glossary-check catalog-check storybook-build snapshots-check lint-changed \
	typecheck test-changed test-visual-changed

# Fails if the working tree differs from the last commit in any way (changed, staged or untracked files). CI checks
# out the commit, so it sees only what's committed.
committed-check:
	@changes="$$(git status --porcelain --untracked-files=all)"; \
	if [ -n "$$changes" ]; then \
		echo "$$changes" >&2; \
		echo "error: the files above aren't committed, so CI won't see them as they are here. Commit or stash them." >&2; \
		exit 1; \
	fi

# What CI runs, on what CI sees: if this passes, CI will. Fails unless everything is committed, installs the locked
# dependencies, runs every gate with CI=true (so a stray .only fails, as it does in CI), then fails if a gate changed
# or added a file. Run it before pushing; use `make check` while working.
ci:
	@$(MAKE) --no-print-directory committed-check
	CI=true TEST_WORKERS=$${TEST_WORKERS:-4} $(MAKE) --no-print-directory install check
	@$(MAKE) --no-print-directory committed-check

# Add a changeset describing a change (every PR that changes behaviour needs one).
changeset:
	npx changeset

# Apply pending changesets: bump the version, write CHANGELOG.md. Doesn't commit, tag or push.
set-release-version:
	npx changeset version
	npm install --package-lock-only --ignore-scripts --no-audit --no-fund

# Prereleases (on the next branch): versions released while in prerelease mode get a -next.N suffix.
prerelease-enter:
	npx changeset pre enter next

prerelease-exit:
	npx changeset pre exit

# Bump, commit, tag and push a release (see DEVELOPER.md). Options: REMOTE, DRY_RUN=1, SKIP_CHECKS=1, YES=1.
tag-release:
	scripts/tag-release.sh

clean:
	rm -rf dist coverage storybook-static test-results playwright-report
