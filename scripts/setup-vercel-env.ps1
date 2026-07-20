# Sets Vercel environment variables from local .env for production.
# Requires: vercel login && vercel link (from project root)

param(
  [string]$EnvFile = ".env"
)

$required = @(
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY"
)

if (-not (Test-Path $EnvFile)) {
  Write-Error "Missing $EnvFile"
  exit 1
}

$values = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $name, $value = $_ -split '=', 2
  $values[$name.Trim()] = $value.Trim()
}

foreach ($name in $required) {
  if (-not $values[$name] -or $values[$name].Length -eq 0) {
    Write-Warning "Skipping empty variable: $name"
    continue
  }

  Write-Host "Setting $name in Vercel (production)..."
  $values[$name] | vercel env add $name production
}

Write-Host "Done. Redeploy with: vercel --prod"
