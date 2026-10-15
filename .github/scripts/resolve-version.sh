#!/usr/bin/env bash
# Resolves and checks the release version for the release workflows.
#
#   resolve-version.sh <version-or-tag> <publish: true|false>
#
# A leading "v" (as in a tag name) is removed. When publishing, the version must equal package.json's version at the
# tagged commit, so a stray or old tag can't publish. Writes version, dist_tag and is_prerelease to $GITHUB_OUTPUT
# when it's set, and prints them either way.

set -euo pipefail

input="${1:-}"
publish="${2:-false}"
package_version="$(node -p "require('./package.json').version")"
version="${input#v}"
version="${version:-$package_version}"

if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  echo "::error::'$input' isn't a semantic version like 1.2.3 or 1.3.0-next.0"
  exit 1
fi

if [ "$publish" = true ] && [ "$version" != "$package_version" ]; then
  echo "::error::Tag version $version doesn't match package.json version $package_version. Release with make tag-release."
  exit 1
fi

if [[ "$version" == *-* ]]; then
  dist_tag=next
  is_prerelease=true
else
  dist_tag=latest
  is_prerelease=false
fi

echo "version=$version"
echo "dist_tag=$dist_tag"
echo "is_prerelease=$is_prerelease"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "version=$version"
    echo "dist_tag=$dist_tag"
    echo "is_prerelease=$is_prerelease"
  } >> "$GITHUB_OUTPUT"
fi
