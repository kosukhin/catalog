<?php

declare(strict_types=1);

echo "=== PHP " . PHP_VERSION . " — новые возможности 8.2 ===\n\n";

// 1. Readonly-классы
readonly class Config
{
    public function __construct(
        public string $host,
        public int $port,
    ) {}
}
$config = new Config('localhost', 5432);
echo "Readonly-класс: {$config->host}:{$config->port}\n";

// 2. Анонимные readonly-классы
$point = new readonly class(1.5, 2.5) {
    public function __construct(
        public float $x,
        public float $y,
    ) {}
};
echo "Анонимный readonly-класс: ({$point->x}, {$point->y})\n";

// 3. DNF-типы: пересечение объединённое с null
interface HasId { public function id(): int; }
interface HasName { public function name(): string; }

class Product implements HasId, HasName
{
    public function id(): int { return 42; }
    public function name(): string { return 'Ноутбук'; }
}

function describe((HasId&HasName)|null $item): string
{
    return $item === null ? 'нет объекта' : "#{$item->id()} {$item->name()}";
}
echo "DNF-типы: " . describe(new Product()) . " | " . describe(null) . "\n";

// 4. true / false / null как отдельные типы
function alwaysTrue(): true { return true; }
function alwaysFalse(): false { return false; }
function nothing(): null { return null; }

echo "Литеральныые типы: true=" . var_export(alwaysTrue(), true)
    . ", false=" . var_export(alwaysFalse(), true)
    . ", null=" . var_export(nothing(), true) . "\n";

// 5. Атрибут SensitiveParameter — скрытие секретов в stack trace
function connect(
    string $host,
    #[\SensitiveParameter] string $password,
): bool {
    return $password !== '';
}
echo "SensitiveParameter: connect() = " . var_export(connect('db.local', 'secret'), true) . "\n";

// 6. Новые функции Random
$random = new \Random\Randomizer();
echo "Randomizer: случайный байт = " . bin2hex($random->getBytes(1)) . "\n";

// 7. Динамические свойства deprecated (демонстрация — сSuppressWarnings, просто факт)
echo "Динамические свойства: теперь deprecated, создавайте явно объявленные свойства\n";
