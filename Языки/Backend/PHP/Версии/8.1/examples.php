<?php

declare(strict_types=1);

echo "=== PHP " . PHP_VERSION . " — новые возможности 8.1 ===\n\n";

// 1. Enums (backed enums)
enum Status: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            Status::Draft    => 'Черновик',
            Status::Published => 'Опубликован',
            Status::Archived => 'В архиве',
        };
    }
}
$article = Status::Published;
echo "Enum: {$article->value} → {$article->label()}\n";
echo "Enum::cases: " . count(Status::cases()) . " значения\n";

// 2. Readonly-свойства
class User
{
    public function __construct(
        public readonly string $name,
        public readonly int $age,
    ) {}
}
$user = new User('Анна', 30);
echo "Readonly: {$user->name}, {$user->age} лет\n";

// 3. Pure intersection types
interface Loggable { public function log(): void; }
interface Serializable { public function serialize(): string; }

function handle(Loggable&Serializable $obj): void
{
    echo "Intersection: объект умеет и логировать, и сериализоваться\n";
}

class Post implements Loggable, Serializable
{
    public function log(): void {}
    public function serialize(): string { return 'post'; }
}
handle(new Post());

// 4. First-class callable syntax
$callable = strlen(...);
echo "First-class callable: длина 'hello' = {$callable('hello')}\n";

// 5. never return type
function fail(): never
{
    throw new RuntimeException('что-то пошло не так');
}
try {
    fail();
} catch (RuntimeException $e) {
    echo "never: поймали «{$e->getMessage()}»\n";
}

// 6. array_is_list
echo "array_is_list([1,2,3]): " . var_export(array_is_list([1, 2, 3]), true) . "\n";
echo "array_is_list(['a'=>1]): " . var_export(array_is_list(['a' => 1]), true) . "\n";

// 7. new в инициализаторах
class Logger
{
    public function __construct(
        public readonly ?DateTime $createdAt = new DateTime(),
    ) {}
}
echo "new в initializers: дата создания = " . (new Logger())->createdAt->format('Y-m-d') . "\n";
