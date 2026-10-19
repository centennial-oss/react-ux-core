#!/usr/bin/env bash
# Prepares, tags and pushes a release. See Releasing in DEVELOPER.md.
#
#   make tag-release                  # release from main to the "upstream" remote
#   REMOTE=origin make tag-release    # use another remote
#   DRY_RUN=1 make tag-release        # show every step without changing anything
#   SKIP_CHECKS=1 make tag-release    # skip `make ci` (CI's release workflow still runs every gate)
#   YES=1 make tag-release            # don't ask for confirmation
#
# Steps: check the branch and working tree, work out the next version from pending changesets, refuse if its tag
# already exists, run `make ci`, confirm, run `changeset version`, commit the release if files changed, tag it,
# then push the commit to main and push that one tag. Pushing the tag starts .github/workflows/release.yml.

set -euo pipefail

REMOTE="${REMOTE:-upstream}"
BRANCH="${BRANCH:-main}"
DRY_RUN="${DRY_RUN:-0}"
SKIP_CHECKS="${SKIP_CHECKS:-0}"
YES="${YES:-0}"

fail() {
  echo "error: $*" >&2
  exit 1
}

# Runs a command that changes something, or only prints it in a dry run.
run() {
  if [ "$DRY_RUN" = 1 ]; then
    echo "[dry run] $*"
  else
    echo "+ $*"
    "$@"
  fi
}

cd "$(git rev-parse --show-toplevel)"

# 1. Preconditions.
current_branch="$(git symbolic-ref --short -q HEAD || true)"
[ "$current_branch" = "$BRANCH" ] || fail "you're on '${current_branch:-a detached HEAD}'. Switch to '$BRANCH' first."
git remote get-url "$REMOTE" > /dev/null 2>&1 || fail "there's no git remote named '$REMOTE'. Set REMOTE=<name>."
[ -z "$(git status --porcelain)" ] || fail "the working tree has uncommitted changes. Commit or stash them first."

echo "Fetching $REMOTE/$BRANCH..."
git fetch --quiet "$REMOTE" "$BRANCH"
[ "$(git rev-parse HEAD)" = "$(git rev-parse FETCH_HEAD)" ] ||
  fail "local $BRANCH isn't the same commit as $REMOTE/$BRANCH. Pull (or push) first."

# 2. The version this release will have.
pending="$(find .changeset -maxdepth 1 -name '*.md' ! -name 'README.md' 2> /dev/null | wc -l | tr -d ' ')"
if [ "$pending" -gt 0 ]; then
  status_file="$(mktemp)"
  trap 'rm -f "$status_file"' EXIT
  npx changeset status --output="$status_file" > /dev/null
  version="$(node -e "const s = JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8')); process.stdout.write(s.releases[0]?.newVersion ?? '')" "$status_file")"
  [ -n "$version" ] || fail "couldn't work out the next version from the pending changesets."
else
  version="$(node -p "require('./package.json').version")"
fi
tag="v$version"

if git rev-parse -q --verify "refs/tags/$tag" > /dev/null; then
  fail "tag $tag already exists locally. Add a changeset to release a new version."
fi
if git ls-remote --exit-code --tags "$REMOTE" "refs/tags/$tag" > /dev/null 2>&1; then
  fail "tag $tag already exists on $REMOTE. Add a changeset to release a new version."
fi

# 3. Run every gate as CI runs it before anything is changed.
if [ "$SKIP_CHECKS" = 1 ]; then
  echo "Skipping make ci (SKIP_CHECKS=1)."
else
  run make ci
fi

# 4. Confirm.
echo
echo "Ready to release $tag from $BRANCH to $REMOTE:"
if [ "$pending" -gt 0 ]; then
  echo "  - apply $pending pending changeset(s) with changeset version and commit 'Release $tag'"
else
  echo "  - no pending changesets; package.json is already at $version"
fi
echo "  - git tag $tag"
echo "  - push $BRANCH and $tag to $REMOTE (the tag push publishes to npm)"
if [ "$DRY_RUN" != 1 ] && [ "$YES" != 1 ]; then
  read -r -p "Continue? [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || fail "cancelled; nothing was changed."
fi

# 5. Version bump and changelog, then commit.
if [ "$pending" -gt 0 ]; then
  run make set-release-version
  if [ "$DRY_RUN" != 1 ]; then
    actual="$(node -p "require('./package.json').version")"
    [ "$actual" = "$version" ] || fail "changeset version produced $actual, expected $version. Nothing was committed."
  fi
fi
if { [ "$DRY_RUN" = 1 ] && [ "$pending" -gt 0 ]; } || { [ "$DRY_RUN" != 1 ] && [ -n "$(git status --porcelain)" ]; }; then
  run git add package.json package-lock.json CHANGELOG.md .changeset
  run git commit --signoff -m "Release $tag"
fi

# 6. Tag and push.
run git tag "$tag"
run git push "$REMOTE" "HEAD:refs/heads/$BRANCH"
run git push "$REMOTE" "refs/tags/$tag"

echo
if [ "$DRY_RUN" = 1 ]; then
  echo "Dry run finished; nothing was changed."
else
  echo "Pushed $tag. The release workflow is now publishing it; watch it in the repository's Actions tab."
fi
