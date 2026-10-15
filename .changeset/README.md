# Changesets

Every pull request that changes the library's behaviour adds a changeset: a short Markdown file describing the change
and its semver bump. Create one with:

```sh
make changeset
```

At release time, `make tag-release` turns the pending changesets into a version bump and a `CHANGELOG.md` entry. See
[Releasing](../DEVELOPER.md#releasing) in DEVELOPER.md.

A breaking change needs a `major` changeset that says what broke and how to migrate.
