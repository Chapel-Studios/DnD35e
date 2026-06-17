# gh CLI GraphQL from PowerShell

`gh api graphql -f query='...'` and `-f query=$var` both fail when the query
contains tokens like `"Chapel-Studios"` or any `-X` substring — gh re-parses
them as flags ("Expected type 'number', but it was malformed: \"-Studios\"").

**Fix**: write the query/mutation to a temp file and use the `@file` form:

```powershell
gh api graphql -F query=@.tmp.graphql -F threadId=$id > out.json
```

`-F` (uppercase) is the typed/file form; `@file` reads the value from disk so
the shell never sees the query content as argv.

Used for resolving PR review threads: fetch via `reviewThreads(first:50)` query
to get `PRRT_*` node IDs, then loop `resolveReviewThread(input:{threadId:$id})`
mutation per thread.
