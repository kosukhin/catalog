<?php

declare(strict_types=1);

echo "=== PHP " . PHP_VERSION . " — новые возможности 8.0 ===\n\n";

// 1. Named arguments — именованные аргументы
function makeCoffee(string $type, bool $sugar = false, bool $milk = true): string
{
    return "$type" . ($milk ? ' с молоком' : ' без молока') . ($sugar ? ' и с сахаром' : '');
}
echo "Named arguments: " . makeCoffee(type: 'эспрессо', milk: false) . "\n";

// 2. Constructor property promotion
class Point
{
    public function __construct(
        private float $x = 0.0,
        private float $y = 0.0,
    ) {}

    public function distance(): float
    {
        return sqrt($this->x ** 2 + $this->y ** 2);
    }
}
echo "Promotion: расстояние от (3,4) = " . (new Point(3, 4))->distance() . "\n";

// 3. Union types
function process(int|string $input): int|string
{
    return is_int($input) ? $input * 2 : strtoupper($input);
}
echo "Union types: " . process(21) . " / " . process('abc') . "\n";

// 4. Match-выражение
$code = 404;
$message = match ($code) {
    200, 201 => 'OK',
    404      => 'Не найдено',
    500      => 'Ошибка сервера',
    default  => 'Неизвестный код',
};
echo "Match: $code → $message\n";

// Важно: match вычисляется один раз и не «связан» с переменной
$code = 200; // меняем исходную переменную
echo "Match не пересчитывается: \$code=200, но \$message всё ещё «{$message}»\n";

// 5. Nullsafe-оператор
$repository = null;
$userName = $repository?->getUser()?->getName() ?? 'гость';
echo "Nullsafe: $userName\n";

// 6. str_contains / str_starts_with / str_ends_with
$haystack = 'PHP 8.0 — это мощно';
echo "str_contains: " . var_export(str_contains($haystack, '8.0'), true) . "\n";
echo "str_starts_with: " . var_export(str_starts_with($haystack, 'PHP'), true) . "\n";
echo "str_ends_with: " . var_export(str_ends_with($haystack, 'мощно'), true) . "\n";

// 7. Attributes (вместо докблок-аннотаций)
#[Route('/api/users', methods: ['GET'])]
class UserController {}

echo "Attributes: у UserController есть атрибут Route\n";

// 8. Строгие сравнения: '0' больше не равен false
echo "Сравнения: '0' == false → " . var_export('0' == false, true) . "\n";

// 9. ::class на объекте
echo "::class на объекте: " . (new UserController())::class . "\n";
