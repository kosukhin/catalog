# Typesense Test Search App

## Run

```bash
docker compose up
```

## Index data

```bash
docker compose exec backend npm run index
```

## Search

```bash {"terminalRows":"18"}
curl "http://localhost:3000/search?q=%D0%BA%D0%B8%D0%BD%D0%BE" | jq
```

## Health

```bash
curl http://localhost:3000/health
```
