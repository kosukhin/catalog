```sh
docker compose up -d
```

```sh
# отправить событие
curl -X POST http://localhost:3001/events -H 'Content-Type: application/json' \
  -d '{"user":"alice","action":"login"}'
```