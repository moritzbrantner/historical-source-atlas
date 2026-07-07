# Issue Tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `moritzbrantner/historical-source-atlas`. Use the `gh` CLI or the GitHub connector for all issue operations.

## Conventions

- Create an issue: `gh issue create --repo moritzbrantner/historical-source-atlas --title "..." --body "..."`
- Read an issue: `gh issue view <number> --repo moritzbrantner/historical-source-atlas --comments`
- List issues: `gh issue list --repo moritzbrantner/historical-source-atlas --state open --json number,title,body,labels,comments`
- Comment on an issue: `gh issue comment <number> --repo moritzbrantner/historical-source-atlas --body "..."`
- Apply or remove labels: `gh issue edit <number> --repo moritzbrantner/historical-source-atlas --add-label "..."` or `--remove-label "..."`
- Close an issue: `gh issue close <number> --repo moritzbrantner/historical-source-atlas --comment "..."`

## Publishing Work

When a skill says "publish to the issue tracker", create a GitHub issue in `moritzbrantner/historical-source-atlas`.

When a skill says "fetch the relevant ticket", run `gh issue view <number> --repo moritzbrantner/historical-source-atlas --comments`.
