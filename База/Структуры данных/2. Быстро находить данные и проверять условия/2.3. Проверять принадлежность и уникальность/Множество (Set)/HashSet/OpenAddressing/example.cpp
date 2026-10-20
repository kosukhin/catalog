#include <algorithm>
#include <cstdint>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

inline std::size_t hash_string(std::string_view key) {
    std::size_t hash = 14695981039346656037ULL;
    for (unsigned char c : key) {
        hash ^= static_cast<std::size_t>(c);
        hash *= 1099511628211ULL;
    }
    return hash;
}

struct Cell {
    std::string key;
    bool removed = false;
    Cell() = default;
    explicit Cell(std::string key) : key(std::move(key)) {}
};

inline std::size_t max_capacity() { return 257; }

template <typename Key = std::string>
class QuadraticHashSet {
   public:
    explicit QuadraticHashSet(std::size_t capacity = 16, double load_factor = 0.75)
        : capacity_(next_power_of_two(std::max(capacity, 1ULL))),
          load_factor_(load_factor),
          count_(0) {
        buckets_.assign(capacity_, Cell());
    }

    void insert(const Key& key) {
        if (is_full()) {
            std::cerr << "[INFO] load_factor >= 1; rehash not possible; throwing\n";
            throw std::runtime_error("HashSet is full");
        }
        if (contains(key)) {
            return;
        }

        std::size_t index = hash(key) % capacity_;
        std::size_t start = index;
        std::size_t i = 0;

        do {
            if (buckets_[index].removed || buckets_[index].key.empty()) {
                buckets_[index] = Cell(key);
                ++count_;
                std::cout << "insert \"" << key << "\" -> index " << index
                          << " (probe " << i << ")\n";
                return;
            }
            ++i;
            index = (static_cast<std::ssize_t>(index) + i * i) % capacity_;
        } while (i <= capacity_);

        throw std::runtime_error("Quadratic probing cycle detected");
    }

    bool contains(const Key& key) const {
        std::size_t index = hash(key) % capacity_;
        std::size_t start = index;
        std::size_t i = 0;

        while (true) {
            Cell& cell = buckets_[index];
            if (cell.key == key && !cell.removed) {
                return true;
            }
            if (cell.key.empty() && !cell.removed) {
                return false;
            }
            ++i;
            index = (static_cast<std::ssize_t>(index) + i * i) % capacity_;
            if (index == start) {
                return false;
            }
        }
    }

    bool remove(const Key& key) {
        std::size_t index = hash(key) % capacity_;
        std::size_t start = index;
        std::size_t i = 0;

        while (true) {
            Cell& cell = buckets_[index];
            if (cell.key == key && !cell.removed) {
                cell.removed = true;
                --count_;
                return true;
            }
            if (cell.key.empty() && !cell.removed) {
                return false;
            }
            ++i;
            index = (static_cast<std::ssize_t>(index) + i * i) % capacity_;
            if (index == start) {
                return false;
            }
        }
    }

    std::size_t size() const { return count_; }
    bool empty() const { return count_ == 0; }

    double load_factor() const {
        return capacity_ > 0 ? static_cast<double>(count_) / capacity_ : 0.0;
    }

    void print(const std::vector<Key>& keys) const {
        std::cout << "keys:";
        for (const auto& k : keys) {
            std::cout << " " << k;
        }
        std::cout << "\ncapacity=" << capacity_ << " count=" << count_
                  << " load=" << load_factor() << "\n";
    }

   private:
    static std::size_t next_power_of_two(std::size_t v) {
        v--;
        v |= v >> 1;
        v |= v >> 2;
        v |= v >> 4;
        v |= v >> 8;
        v |= v >> 16;
        v |= v >> 32;
        v++;
        return std::min(v, max_capacity());
    }

    bool is_full() const { return load_factor_ <= 1.0 && count_ >= capacity_; }

    std::size_t hash(const Key& key) const {
        if constexpr (std::is_same_v<Key, std::string>) {
            return hash_string(key);
        } else {
            std::hash<Key> hasher{};
            return hasher(key);
        }
    }

    std::vector<Cell> buckets_;
    std::size_t capacity_;
    double load_factor_;
    std::size_t count_;
};

int main() {
    std::cout << "=== Quadratic probing in HashSet (Open Addressing) ===\n";

    std::vector<std::string> keys = {
        "apple", "april", "banana", "berry", "cherry", "date",
        "elder", "fig", "grape", "guava", "honey", "mint",
        "orange", "papaya", "kiwi", "lemon", "mango", "nectarine",
    };

    QuadraticHashSet<std::string> set(16, 0.75);

    std::cout << "\n--- Вставка ключей ---\n";
    for (const auto& key : keys) {
        std::cout << "insert \"" << key << "\": ";
        try {
            set.insert(key);
            std::cout << "OK\n";
        } catch (const std::exception& e) {
            std::cout << "FAIL: " << e.what() << "\n";
        }
    }

    std::cout << "\n--- Проверка уникальности ---\n";
    set.print(keys);
    std::cout << "contains 'apple': " << set.contains("apple") << "\n";
    std::cout << "contains 'applex': " << set.contains("applex") << "\n";
    std::cout << "size=" << set.size() << ", expected " << keys.size() << "\n";

    std::cout << "\n--- Удаление ---\n";
    const std::string remove_key = "cherry";
    std::cout << "remove \"" << remove_key << "\": "
              << (set.remove(remove_key) ? "OK" : "not found") << "\n";
    std::cout << "contains \"" << remove_key << "\": " << set.contains(remove_key)
              << "\n";
    std::cout << "contains removed \"" << remove_key
              << "\" after deletion: " << set.contains(remove_key)
              << " (should be false)\n";

    std::cout << "\n--- Вставка после удаления ---\n";
    std::string reinsert_key = "cherry";
    set.insert(reinsert_key);
    std::cout << "after reinsert, contains \"" << reinsert_key << "\": "
              << set.contains(reinsert_key) << "\n";
    std::cout << "size=" << set.size() << ", expected " << keys.size() << "\n";

    std::cout << "\n--- Наконец, переполнение ---\n";
    std::cout << "Final: capacity=" << set.capacity_ << ", count=" << set.size()
              << ", load=" << set.load_factor() << "\n";

    bool all_found = true;
    for (const auto& key : keys) {
        if (!set.contains(key)) {
            all_found = false;
            break;
        }
    }
    std::cout << "\nПроверка: все " << keys.size() << " уникальных ключей "
                 "найдены: "
              << (all_found ? "OK" : "FAIL") << "\n";
    return all_found ? 0 : 1;
}
