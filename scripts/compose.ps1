param(
  [ValidateSet('up', 'scrape', 'status', 'down', 'logs')]
  [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'
$composeArgs = @('-f', 'docker-compose.yml', '-f', 'docker-compose.prod.yml')

switch ($Action) {
  'up' {
    docker compose @composeArgs up --build -d web
    break
  }
  'scrape' {
    docker compose @composeArgs --profile scrape run --rm scraper
    break
  }
  'status' {
    docker compose @composeArgs ps
    break
  }
  'down' {
    docker compose @composeArgs down
    break
  }
  'logs' {
    docker compose @composeArgs logs -f web
    break
  }
}

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
