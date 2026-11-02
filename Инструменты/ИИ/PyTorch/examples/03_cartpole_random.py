#!/usr/bin/env python3
"""Пример 3. CartPole со случайной политикой: цикл взаимодействия со средой.

Запуск:
    docker compose run --rm pytorch python examples/03_cartpole_random.py
"""

from __future__ import annotations

import sys

import gymnasium as gym


def run_episode(env: gym.Env, seed: int) -> tuple[float, int]:
    """Прогоняет один эпизод со случайной политикой и возвращает (награду, шаги)."""
    env.reset(seed=seed)
    total_reward = 0.0
    steps = 0
    while True:
        action = env.action_space.sample()  # случайная политика
        _, reward, terminated, truncated, _ = env.step(action)
        total_reward += reward
        steps += 1
        if terminated or truncated:
            return total_reward, steps


def main() -> int:
    env = gym.make("CartPole-v1")
    print(f"среда: {env.spec.id}")
    print(f"наблюдение: {env.observation_space.shape}, действий: {env.action_space.n}")

    rewards = []
    for episode in range(1, 11):
        total_reward, steps = run_episode(env, seed=episode)
        rewards.append(total_reward)
        print(f"эпизод {episode:2d}: награда {total_reward:5.1f}, шагов {steps:3d}")
    env.close()

    print(f"средняя награда случайной политики: {sum(rewards) / len(rewards):.1f} (максимум среды 500)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
