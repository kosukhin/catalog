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

```bash
curl "http://localhost:3000/search?q=кино"
```

## Health

```bash
curl http://localhost:3000/health
```
