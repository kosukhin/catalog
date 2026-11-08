-- Данные для примера: два пользователя и один общий счёт на 1000 ₽.
-- Агенты будут одновременно зачислять на него и списывать с него.

INSERT INTO users (id, name) VALUES
    (1, 'Анна'),
    (2, 'Пётр');

INSERT INTO accounts (id, title, balance) VALUES
    (1, 'Общий счёт Анны и Петра', 1000);

INSERT INTO account_members (account_id, user_id) VALUES
    (1, 1),
    (1, 2);
