.PHONY: developer-setup install build dev link unlink pack test test-watch lint typecheck format format-check \
	storybook storybook-build test-visual update-snapshots size licenses pack-check check changeset \
	set-release-version prerelease-enter prerelease-exit tag-release clean

# Playwright's Linux image for visual snapshots, so baselines match everywhere. Keep the tag in step with
# @playwright/test.
PLAYWRIGHT_IMAGE ?= mcr.microsoft.com/playwright:v1.64.1-noble
# Storybook dev server: 0.0.0.0 makes it reachable from phones on the same network; use localhost to keep it local.
STORYBOOK_HOST ?= 0.0.0.0
STORYBOOK_PORT ?= 6006
# Visual tests run in Docker by default; CI sets VISUAL_RUNNER=native because its job already runs in the image.
VISUAL_RUNNER ?= docker
# Resource caps for the visual test container and its Chromium workers, so a run doesn't take over the machine.
DOCKER_CPUS ?= 2
DOCKER_MEMORY ?= 2g
VISUAL_WORKERS ?= 2
DOCKER_RUN = docker run --rm --init --ipc=host --cpus=$(DOCKER_CPUS) --memory=$(DOCKER_MEMORY) \
	-e VISUAL_WORKERS=$(VISUAL_WORKERS) -v "$(CURDIR)":/work -w /work $(PLAYWRIGHT_IMAGE)
# Limits test and test-watch to matching test files, e.g. FILTER=ComboBox or FILTER=src/form.
FILTER ?=
# Where pack writes the package tarball.
PACK_DIR ?= .

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

test-watch:
	npm run test:watch -- $(FILTER)

lint:
	npm run lint

typecheck:
	npm run typecheck

format:
	npm run format

format-check:
	npm run format:check

storybook:
	npx storybook dev --port $(STORYBOOK_PORT) --host $(STORYBOOK_HOST)

storybook-build:
	npm run storybook:build

# Visual snapshots of every story at phone, tablet and desktop sizes, in light and dark. Run storybook-build
# first; `make check` does.
test-visual:
ifeq ($(VISUAL_RUNNER),native)
	npx playwright test
else
	$(DOCKER_RUN) npx playwright test
endif

# Re-record visual baselines after an intended visual change, then review the new images before committing.
update-snapshots:
ifeq ($(VISUAL_RUNNER),native)
	npx playwright test --update-snapshots
else
	$(DOCKER_RUN) npx playwright test --update-snapshots
endif

# Bundle-size budget per entry point. Run build first.
size:
	npx size-limit

# Runtime dependencies must use Apache-2.0-compatible licenses.
licenses:
	node scripts/check-licenses.mjs

# Only dist/, LICENSE, NOTICE, README.md and package.json may be published. Run build first.
pack-check:
	node scripts/check-pack.mjs

# Every gate CI runs. Run this before calling work done.
check: lint format-check typecheck test build size licenses pack-check storybook-build test-visual

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
