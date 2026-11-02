#!/usr/bin/env python3
"""Пример 4. Policy gradient (REINFORCE) на CartPole — первое обучение агента.

Запуск:
    docker compose run --rm pytorch python examples/04_cartpole_reinforce.py
    docker compose run --rm pytorch python examples/04_cartpole_reinforce.py --episodes 500

Обучение останавливается, когда средняя награда за 20 эпизодов достигает --target.
"""

from __future__ import annotations

import argparse
import sys
from collections import deque

import gymnasium as gym
import torch
from torch import nn
from torch.distributions import Categorical


class Policy(nn.Module):
    """Простая политика: по наблюдению выдаёт распределение вероятностей действий."""

    def __init__(self, observations: int, actions: int) -> None:
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(observations, 64),
            nn.ReLU(),
            nn.Linear(64, actions),
        )

    def forward(self, observation: torch.Tensor) -> Categorical:
        return Categorical(logits=self.network(observation))


def play_episode(env: gym.Env, policy: Policy) -> tuple[list[torch.Tensor], list[float]]:
    """Играет эпизод, запоминая log-вероятности действий и награды."""
    log_probabilities: list[torch.Tensor] = []
    rewards: list[float] = []

    observation, _ = env.reset()
    while True:
        distribution = policy(torch.as_tensor(observation, dtype=torch.float32))
        action = distribution.sample()
        log_probabilities.append(distribution.log_prob(action))

        observation, reward, terminated, truncated, _ = env.step(action.item())
        rewards.append(reward)
        if terminated or truncated:
            return log_probabilities, rewards


def discounted_returns(rewards: list[float], gamma: float = 0.99) -> torch.Tensor:
    """Считает сумму наград с дисконтированием от конца эпизода к началу."""
    returns: list[float] = []
    running = 0.0
    for reward in reversed(rewards):
        running = reward + gamma * running
        returns.append(running)
    returns.reverse()
    return torch.tensor(returns)


def main() -> int:
    parser = argparse.ArgumentParser(description="REINFORCE на CartPole")
    parser.add_argument("--episodes", type=int, default=300, help="максимум эпизодов обучения")
    parser.add_argument("--target", type=float, default=475.0, help="средняя награда, при которой останавливаемся")
    parser.add_argument("--learning-rate", type=float, default=0.01)
    args = parser.parse_args()

    torch.manual_seed(42)
    env = gym.make("CartPole-v1")
    policy = Policy(env.observation_space.shape[0], env.action_space.n)
    optimizer = torch.optim.Adam(policy.parameters(), lr=args.learning_rate)

    recent_rewards: deque[int] = deque(maxlen=20)
    for episode in range(1, args.episodes + 1):
        log_probabilities, rewards = play_episode(env, policy)

        returns = discounted_returns(rewards)
        # Нормировка returns уменьшает разброс градиента — так обучение стабильнее.
        returns = (returns - returns.mean()) / (returns.std() + 1e-8)

        loss = -(torch.stack(log_probabilities) * returns).sum()
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        recent_rewards.append(len(rewards))
        if episode % 20 == 0:
            mean_reward = sum(recent_rewards) / len(recent_rewards)
            print(f"эпизод {episode:3d}: средняя награда {mean_reward:6.1f}, loss {loss.item():8.3f}")
            if len(recent_rewards) == recent_rewards.maxlen and mean_reward >= args.target:
                print(f"агент обучен за {episode} эпизодов")
                break

    env.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
