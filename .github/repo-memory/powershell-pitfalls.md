# PowerShell Pitfalls in Terminal Commands

**Verified**: April 2026 session — `git commit -m "Phase 8 (Pipeline & Branching)"` failed with `pathspec '...' did not match any file(s)`.

## `&` is a command separator in PowerShell

PowerShell parses `&` as the call operator / command separator, even inside double-quoted strings passed to external commands. The shell breaks the string at `&` before `git` ever sees it.

**Fails**:
```powershell
git commit -m "Pipeline & Branching"
# error: pathspec 'Branching"' did not match any file(s)
```

**Fixes** (in order of preference):
1. **Reword** the message to avoid `&` (e.g. "Pipeline and Branching")
2. **Commit message file**:
   ```powershell
   $msg = @"
   Subject line here
   
   Body with & symbols and other shell metacharacters is fine.
   "@
   [System.IO.File]::WriteAllText("$PWD\.git\COMMIT_EDITMSG_TMP", $msg, (New-Object System.Text.UTF8Encoding $false))
   git commit -F .git\COMMIT_EDITMSG_TMP
   Remove-Item .git\COMMIT_EDITMSG_TMP
   ```
3. Single quotes around the whole `-m` value if the body has no apostrophes: `git commit -m 'Pipeline & Branching'`

## Other PowerShell gotchas

- **Never use `&&`** to chain commands. Use `;` instead. (Already in copilot-instructions.md but worth recording the cost: a chained `&&` is silently treated as call-operator + empty operand.)
- **Avoid Unix utilities**: `head`, `cat -n`, etc. Prefer `Select-Object -First N`, `Get-Content`.
- **Astral-plane emoji round-tripping**: when scripting emoji into files, use `[char]::ConvertFromUtf32(0x1F4DD)` (gives proper UTF-16 surrogate pair) and write with `System.Text.UTF8Encoding($false)` (no BOM). Don't paste raw emoji into here-strings if the script will be passed through multiple shell layers.
