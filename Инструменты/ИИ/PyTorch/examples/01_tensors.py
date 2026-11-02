#!/usr/bin/env python3
"""Пример 1. Тензоры, операции и автоград.

Запуск:
    docker compose run --rm pytorch python examples/01_tensors.py
"""

from __future__ import annotations

import sys

import torch


def main() -> int:
    print(f"torch {torch.__version__}")

    # Тензор — многомерный массив, который умеет считать на CPU и GPU.
    x = torch.arange(12, dtype=torch.float32).reshape(3, 4)
    print("x =\n", x)
    print("форма:", tuple(x.shape), "| dtype:", x.dtype, "| устройство:", x.device)

    # Операции: поэлементные и матричные.
    print("x * 2 =\n", x * 2)
    print("x @ x.T =\n", x @ x.T)
    print("x.mean() =", x.mean().item())

    # Автоград: PyTorch сам считает производные по requires_grad-тензорам.
    weight = torch.tensor([0.0], requires_grad=True)
    loss = (weight * 3 - 6) ** 2  # минимум в точке weight = 2
    loss.backward()
    print(f"loss = {loss.item():.3f}, dloss/dweight = {weight.grad.item():.3f}")

    # Ручной градиентный спуск к минимуму.
    learning_rate = 0.1
    for step in range(1, 9):
        loss = (weight * 3 - 6) ** 2
        weight.grad = None
        loss.backward()
        with torch.no_grad():
            weight -= learning_rate * weight.grad
        print(f"шаг {step}: weight = {weight.item():.4f}, loss = {loss.item():.4f}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
