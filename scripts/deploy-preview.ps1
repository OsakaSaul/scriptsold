# Deploys public/ to the Cloudflare Pages project "scriptsold" (preview address
# https://scriptsold.pages.dev). Run it from anywhere:
#
#   powershell -ExecutionPolicy Bypass -File scripts\deploy-preview.ps1
#
# It never logs in, never creates an account or a token, never touches DNS and
# never attaches scriptsold.com. If wrangler is not logged in it stops and tells
# you the one step you must do yourself.
#
# After the deploy it fetches the address and checks HTTP 200 and the engine
# script tag. Only then does it flip the status block in README.md and
# submission/devpost.md from "not deployed" to "LIVE".

[CmdletBinding()]
param(
  [string]$Project = 'scriptsold',
  [string]$Url = 'https://scriptsold.pages.dev',
  [string]$AccountId = '03280120e6b920d65fcac5c9937bad84',
  [switch]$SkipTests
)

$ErrorActionPreference = 'Continue'  # native stderr must not abort; every step is checked by hand
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Node 22 for wrangler 4 (this machine keeps it here; ignored if absent).
$node22 = 'C:\Users\ritekit\nodejs22'
if (Test-Path $node22) { $env:PATH = "$node22;$env:PATH" }

function Stop-WithStep {
  Write-Host ''
  Write-Host 'NEEDS SAUL: Cloudflare is not logged in on this computer, so nothing was created or deployed.'
  Write-Host 'One-time step: run   npx wrangler login   in your own terminal'
  Write-Host '(in Claude Code you can type   ! npx wrangler login   ). A browser opens, you click Allow.'
  Write-Host 'Then run this script again:   powershell -ExecutionPolicy Bypass -File scripts\deploy-preview.ps1'
  exit 2
}

# 1. Refuse to run unless wrangler is authenticated (read-only check; the account email is not printed).
Write-Host 'Checking wrangler login (read-only)...'
$who = (& npx --yes wrangler whoami 2>&1 | Out-String)
$whoCode = $LASTEXITCODE
if ($whoCode -ne 0 -or $who -match 'not authenticated' -or $who -match 'wrangler login') { Stop-WithStep }
Write-Host 'wrangler is authenticated.'

# 2. Tests and a fresh site build.
if (-not $SkipTests) {
  Write-Host 'Running npm test...'
  & npm test --silent
  if ($LASTEXITCODE -ne 0) { throw 'npm test failed; not deploying.' }
}
& node scripts/build-site.mjs
if ($LASTEXITCODE -ne 0) { throw 'site build failed' }

if (-not $env:CLOUDFLARE_ACCOUNT_ID) { $env:CLOUDFLARE_ACCOUNT_ID = $AccountId }

# 3. Create the Pages project once (already exists is fine), then deploy public/.
Write-Host "Creating Pages project '$Project' if it does not exist..."
$create = (& npx wrangler pages project create $Project --production-branch main 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0 -and $create -notmatch 'already exists') {
  Write-Host $create
  throw 'project create failed'
}
Write-Host "Deploying public/ to '$Project' (branch main)..."
& npx wrangler pages deploy public --project-name $Project --branch main
if ($LASTEXITCODE -ne 0) { throw 'wrangler pages deploy failed' }

# 4. Check the address: HTTP 200 and the engine script tag. Retry while it propagates.
function Get-Page([string]$u) {
  $tmp = New-TemporaryFile
  try {
    $code = (& curl.exe -s --ssl-no-revoke -L -o $tmp.FullName -w '%{http_code}' $u)
    return @{ Code = $code; Body = (Get-Content -Raw -ErrorAction SilentlyContinue $tmp.FullName) }
  } finally { Remove-Item -Force -ErrorAction SilentlyContinue $tmp.FullName }
}

$ok = $false
for ($i = 1; $i -le 12; $i++) {
  $page = Get-Page $Url
  $tag = '<script type="module" src="app.js"></script>'
  if ($page.Code -eq '200' -and $page.Body -and $page.Body.Contains($tag)) {
    $eng = Get-Page "$Url/engine/resurrect.js"
    if ($eng.Code -eq '200') { $ok = $true; break }
  }
  Write-Host "Not ready yet (HTTP $($page.Code)); waiting 10 s ($i of 12)..."
  Start-Sleep -Seconds 10
}

if (-not $ok) {
  Write-Host "The check FAILED: $Url did not return HTTP 200 with the engine script tag. Docs keep saying 'not deployed'."
  Write-Host 'If the project name was already taken on pages.dev, Cloudflare gave it another address: read it in the deploy output above and re-run with -Url.'
  exit 3
}

# 5. Flip the status block, only now.
$stamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm') + ' UTC'
$live = "Status: LIVE. $Url returned HTTP 200 with the engine script tag at $stamp (checked by scripts/deploy-preview.ps1)."
foreach ($f in @('README.md', 'submission\devpost.md')) {
  if (-not (Test-Path $f)) { continue }
  $text = [IO.File]::ReadAllText((Join-Path $root $f))
  $new = [regex]::Replace($text, '(?s)(<!-- deploy-status:start -->).*?(<!-- deploy-status:end -->)', "`$1`n$live`n`$2")
  [IO.File]::WriteAllText((Join-Path $root $f), $new)
}
Write-Host $live
Write-Host 'Status lines updated. Commit README.md and submission/devpost.md to publish the change.'
