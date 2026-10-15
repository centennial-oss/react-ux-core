#!/usr/bin/env bash
# Publishes a built Storybook into the versioned GitHub Pages site on the gh-pages branch. Each release keeps its own
# folder, so readers can open the docs for the exact version they use.
#
#   deploy-storybook.sh <version> <storybook-dir> <site-dir> [--push]
#
# Clones the gh-pages branch into <site-dir> (or starts it empty if the branch doesn't exist), then:
#   - stable versions go to v<version>/ and replace latest/;
#   - prereleases replace next/;
#   - versions.json, a root index.html that redirects to latest/, .nojekyll and CNAME (the custom domain) are updated.
# With --push it commits and pushes the branch; without it the assembled site is left in <site-dir> for inspection
# (release preflight uploads it as an artifact). Needs GITHUB_TOKEN and GITHUB_REPOSITORY in CI.

set -euo pipefail

version="$1"
storybook_dir="$(cd "$2" && pwd)"
site_dir="$3"
push="${4:-}"
scripts_dir="$(cd "$(dirname "$0")" && pwd)"

# The site's custom domain. GitHub Pages reads it from the CNAME file, so writing it on every deploy keeps the
# domain set even if the branch is ever rebuilt from scratch.
domain="${PAGES_DOMAIN:-react-ux-core.centennialoss.org}"
# PAGES_REMOTE overrides the remote (for testing against a local repository).
remote="${PAGES_REMOTE:-https://x-access-token:${GITHUB_TOKEN:-}@github.com/${GITHUB_REPOSITORY:-centennial-oss/react-ux-core}.git}"

rm -rf "$site_dir"
if git ls-remote --exit-code --heads "$remote" gh-pages > /dev/null 2>&1; then
  git clone --quiet --depth 1 --branch gh-pages "$remote" "$site_dir"
else
  echo "No gh-pages branch yet; starting the site from scratch."
  mkdir -p "$site_dir"
  git -C "$site_dir" init --quiet --initial-branch gh-pages
  git -C "$site_dir" remote add origin "$remote"
fi

if [[ "$version" == *-* ]]; then
  targets=(next)
else
  targets=("v$version" latest)
fi
for target in "${targets[@]}"; do
  rm -rf "${site_dir:?}/$target"
  cp -R "$storybook_dir" "$site_dir/$target"
done

node "$scripts_dir/update-versions.mjs" "$site_dir" "$version"
touch "$site_dir/.nojekyll"
echo "$domain" > "$site_dir/CNAME"
cat > "$site_dir/index.html" << 'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>react-ux-core</title>
    <meta http-equiv="refresh" content="0; url=latest/" />
    <link rel="canonical" href="latest/" />
  </head>
  <body>
    <p><a href="latest/">react-ux-core documentation</a></p>
  </body>
</html>
HTML

echo "Site assembled in $site_dir: ${targets[*]}"
if [ "$push" = --push ]; then
  git -C "$site_dir" config user.name 'github-actions[bot]'
  git -C "$site_dir" config user.email '41898282+github-actions[bot]@users.noreply.github.com'
  git -C "$site_dir" add --all
  git -C "$site_dir" commit --quiet -m "Publish Storybook for v$version"
  git -C "$site_dir" push --quiet origin gh-pages
  echo "Pushed to gh-pages."
fi
