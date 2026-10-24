<?php

declare(strict_types=1);

echo "=== PHP " . PHP_VERSION . " — новые возможности 8.3 ===\n\n";

// 1. Typed class constants — типизированные константы
class Math
{
    public const int MAX = 100;
    public const float PI = 3.14159;
    public const string GREETING = 'Привет';
}
echo "Типизированные константы: MAX=" . Math::MAX . ", PI=" . Math::PI . ", GREETING=" . Math::GREETING . "\n";

// 2. Атрибут #[\Override] — проверка, что метод переопределяет родительский
class Base
{
    public function hello(): string { return 'Привет из Base'; }
}

class Child extends Base
{
    #[\Override]
    public function hello(): string { return 'Привет из Child'; }
}
echo "#[Override]: " . (new Child())->hello() . "\n";

// 3. Динамическое получение константы
$constName = 'MAX';
echo "Динамическая константа: Math::{$constName} = " . Math::{$constName} . "\n";

// 4. json_validate() — валидация без декодирования
$validJson = '{"name": "Анна", "age": 30}';
$invalidJson = '{"name": "Анна", "age": }';

echo "json_validate:\n";
echo "  валидный JSON: " . var_export(json_validate($validJson), true) . "\n";
echo "  невалидный JSON: " . var_export(@json_validate($invalidJson), true) . "\n";

// 5. mb_str_pad()
echo "mb_str_pad: [" . mb_str_pad('Языки', 10, '.', STR_PAD_RIGHT) . "]\n";

// 6. Randomizer::getBytesFromString / getFloat
$randomizer = new \Random\Randomizer();
$alphabet = 'ABCDEFGH';
echo "getBytesFromString: " . $randomizer->getBytesFromString($alphabet, 4) . "\n";
echo "getFloat: " . number_format($randomizer->getFloat(0, 1), 4) . "\n";

// 7. #[\Override] ловит ошибку, если родительского метода нет
// (заккомментировано, чтобы скрипт не падал)
// class Bad extends Base { #[\Override] public function missing() {} } // Fatal error
echo "#[Override] защищает от опечаток в имени переопределяемого метода\n";
