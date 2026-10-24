<?php

declare(strict_types=1);

echo "=== PHP " . PHP_VERSION . " — новые возможности 8.4 ===\n\n";

// 1. Property hooks — хуки свойств (виртуальные свойства)
class User
{
    public string $email {
        set (string $value) {
            $this->email = strtolower(trim($value));
        }
    }

    public string $initials {
        get => strtoupper(mb_substr($this->name, 0, 1)) . mb_substr($this->surname, 0, 1);
    }

    public function __construct(
        public string $name,
        public string $surname,
    ) {}
}

$u = new User('иван', 'петров');
$u->email = '  Ivan.Petrov@Example.COM  ';
echo "Property hooks (set): email = {$u->email}\n";
echo "Property hooks (get): initials = {$u->initials}\n";

// 2. Asymmetric visibility — раздельная видимость
class Account
{
    public private(set) int $balance = 0;

    public function deposit(int $amount): void
    {
        $this->balance += $amount; // изменение только внутри класса
    }
}

$acc = new Account();
$acc->deposit(500);
echo "Asymmetric visibility: balance = {$acc->balance}\n";
// $acc->balance = 1000; // Fatal error снаружи

// 3. new без круглых скобок при цепочке вызовов
class Greeter
{
    public function hello(): string { return 'Привет'; }
    public function world(): string { return $this->hello() . ', мир!'; }
}
echo "Цепочка без скобок: " . new Greeter()->world() . "\n";

// 4. array_find / array_any / array_all
$numbers = [4, 8, 15, 16, 23, 42];

$found = array_find($numbers, fn($n) => $n > 20);
echo "array_find (первое >20): $found\n";

echo "array_all (все чётные?): " . var_export(array_all($numbers, fn($n) => $n % 2 === 0), true) . "\n";
echo "array_any (есть >30?): " . var_export(array_any($numbers, fn($n) => $n > 30), true) . "\n";

// 5. RoundingMode enum для round()
$rounded = round(2.5, 0, \RoundingMode::PositiveInfinity);
echo "RoundingMode: round(2.5, PositiveInfinity) = $rounded\n";

// 6. bcround() — округление bcmath
if (function_exists('bcround')) {
    echo "bcround('3.6') = " . bcround('3.6') . "\n";
} else {
    echo "bcround: bcmath не установлен (в официальном образе можно включить)\n";
}
