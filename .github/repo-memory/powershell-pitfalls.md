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

## `Get-Content -Raw` / `Set-Content` corrupt non-ASCII characters (use bulk regex sparingly)

Windows PowerShell 5.1's `Get-Content`/`Set-Content` default to the console's ANSI codepage, not UTF-8. Reading a file containing `§` (U+00A7, UTF-8 bytes `C2 A7`) with `Get-Content -Raw` and writing it back with `Set-Content` silently mangles the byte sequence into the Unicode replacement character (`U+FFFD`, displays as `�`) on round-trip — with **no error or warning**. This happened across 21 files in one bulk-regex pass before being caught by `Select-String`.

**Fix**: always read/write explicitly as UTF-8 when scripting text edits with non-ASCII content:
```powershell
$utf8 = New-Object System.Text.UTF8Encoding($false)   # no BOM
$content = [System.IO.File]::ReadAllText($path)        # defaults to UTF-8 detection, safer than Get-Content
$new = [regex]::Replace($content, $pattern, $replacement)
[System.IO.File]::WriteAllText($path, $new, $utf8)
```
Also avoid PowerShell 6+-only escape syntax like `` `u{00A7} `` inside replacement strings — PowerShell **5.1** doesn't support it and will insert the literal text `u{00A7}` instead of the character. Build the character via `[char]0x00A7` and concatenate it into the replacement string instead.

**After any bulk non-ASCII text edit**: verify with a repo-wide scan for `[char]0xFFFD` before trusting the result — don't rely on the command's own "no errors" exit status.
