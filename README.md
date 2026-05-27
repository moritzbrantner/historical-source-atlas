# Historical Source Atlas

A small React site for exploring where historical texts, artifacts, inscriptions, and manuscripts entered the record.

## Stack

- Vite
- React
- TypeScript
- `@moritzbrantner/maps`
- `@moritzbrantner/ui`

## Development

```bash
bun run dev
```

This repository expects the sibling `../maps` checkout to be present. In this workspace, `node_modules` is symlinked to `../maps/node_modules`, and `@moritzbrantner/maps` resolves to the sibling maps repository.
