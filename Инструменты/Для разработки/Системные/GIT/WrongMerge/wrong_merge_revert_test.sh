#!/usr/bin/env bash
#
# Тестовый скрипт: воспроизведение случайного мержа test -> main
# и его откат через git revert -m 1.
#
# Запуск:  ./wrong_merge_revert_test.sh
# (git и bash должны быть установлены; скрипт создаёт временный репозиторий)

set -euo pipefail

WORKDIR="$(mktemp -d /tmp/wrong-merge-test.XXXXXX)"
trap 'echo "--- Очистка: $WORKDIR ---"; rm -rf "$WORKDIR"' EXIT

step() { echo; echo "=============== $1 ==============="; }
run()  { echo "\$ $*"; "$@"; }

step "0. Подготовка временного репозитория: $WORKDIR"
cd "$WORKDIR"
git init -q -b main repo
cd repo
git config user.name  "Test User"
git config user.email "test@example.com"
git config commit.gpgsign false

step "1. Начальный коммит в main"
echo "readme v1" > README.md
run git add README.md
run git commit -qm "init: readme in main"
BASE_COMMIT="$(git rev-parse HEAD)"
echo "main base: $BASE_COMMIT $(git log --oneline -1 --format=%s)"

step "2. Создаём ветку test и коммитим в неё"
run git checkout -qb test
echo "feature"  > feature.txt
git add feature.txt
git commit -qm "test: add feature.txt"
echo "feature v2" >> feature.txt
git add feature.txt
git commit -qm "test: update feature.txt"
run git log --oneline test

step "3. Возвращаемся в main и добавляем свой коммит"
run git checkout -q main
echo "main note" > main.txt
git add main.txt
git commit -qm "main: add main.txt"
run git log --oneline main

step "4. ОШИБКА: случайно мержим test в main"
run git merge -q --no-ff -m "merge: accidentally merged test into main" test
MERGE_COMMIT="$(git rev-parse HEAD)"
echo "Мерж-коммит: $MERGE_COMMIT"
run git log --oneline --graph main

step "5. Проверка: feature.txt действительно попал в main"
if [ -f feature.txt ]; then
    echo "Воспроизведено: feature.txt случайно оказался в main (это и есть ошибка)"
else
    echo "FAIL: ошибка не воспроизвелась — feature.txt нет в main"
    exit 1
fi

step "6. Симулируем push (создаём удалённый репозиторий и пушим)"
cd "$WORKDIR"
git init -q --bare origin.git
cd repo
run git remote add origin "$WORKDIR/origin.git"
run git push -q origin main
echo "main запушен в origin — история теперь 'общая', reset уже нельзя"

step "7. ОТКАТ через git revert -m 1"
# -m 1: оставляем содержимое первого родителя мерж-коммита (main до мержа)
run git revert -m 1 --no-edit "$MERGE_COMMIT"
REVERT_COMMIT="$(git rev-parse HEAD)"
echo "Реверт-коммит: $REVERT_COMMIT"
run git log --oneline --graph main
run git push -q origin main

step "8. Проверка результата отката"
if [ -f feature.txt ]; then
    echo "FAIL: feature.txt всё ещё в main"
    exit 1
else
    echo "OK: feature.txt отсутствует в main — мерж успешно откачен"
fi
# свой коммит main.txt должен остаться
test -f main.txt && echo "OK: main.txt на месте — реверт не тронул работу основной ветки"

step "9. Демонстрация подводного камня: повторный merge test ничего не даёт"
run git merge -q test 2>/dev/null && echo "merge прошёл" || echo "git: Already up to date (или без изменений)"
echo "main после повторного merge: $(git ls-files | tr '\n' ' ')"
if [ -f feature.txt ]; then
    echo "FAIL: feature.txt появился неожиданно"
    exit 1
else
    echo "OK: как и предупреждали, повторный merge test НЕ возвращает изменения (git считает их уже в истории)"
fi

step "10. Правильный способ вернуть изменения: revert реверта (или rebase test)"
run git revert --no-edit "$REVERT_COMMIT"
if [ -f feature.txt ]; then
    echo "OK: feature.txt вернулся в main через revert реверта"
else
    echo "FAIL: feature.txt не вернулся"
    exit 1
fi
run git push -q origin main
run git log --oneline --graph main

step "11. Проверка состояния origin"
run git fetch -q origin
AFTER_PUSH="$(git rev-parse origin/main)"
LOCAL="$(git rev-parse main)"
if [ "$AFTER_PUSH" = "$LOCAL" ]; then
    echo "OK: origin/main синхронизирован с локальным main"
else
    echo "FAIL: origin/main отличается от локального main"
    exit 1
fi

step "ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ ✔"