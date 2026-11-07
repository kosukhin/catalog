# Typesense Test Search App

## Run

```bash
docker compose up -d
```

## Index data

```bash
docker compose exec backend npm run index
```

## Search

```bash {"terminalRows":"18"}
curl -G "http://localhost:3000/search" --data-urlencode "q=кино" | jq
```

## Health

```bash
curl http://localhost:3000/health
```
