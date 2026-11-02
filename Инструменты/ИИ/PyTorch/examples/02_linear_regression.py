#!/usr/bin/env python3
"""Пример 2. Линейная регрессия: nn.Linear, MSELoss, SGD и график обучения.

Запуск:
    docker compose run --rm pytorch python examples/02_linear_regression.py

График сохраняется в runs/linear_regression.png (папка runs/ не попадает в git).
"""

from __future__ import annotations

import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # рисование без дисплея (в контейнере его нет)

import matplotlib.pyplot as plt
import torch
from torch import nn

WEIGHT = 3.0
BIAS = 2.0


def make_data(count: int = 200, noise: float = 0.5) -> tuple[torch.Tensor, torch.Tensor]:
    """Генерирует данные по формуле y = WEIGHT * x + BIAS + шум."""
    generator = torch.Generator().manual_seed(42)
    x = torch.rand(count, 1, generator=generator) * 10 - 5
    y = WEIGHT * x + BIAS + torch.randn(count, 1, generator=generator) * noise
    return x, y


def main() -> int:
    torch.manual_seed(42)
    x, y = make_data()

    model = nn.Linear(1, 1)
    loss_fn = nn.MSELoss()
    optimizer = torch.optim.SGD(model.parameters(), lr=0.01)

    history: list[float] = []
    for epoch in range(1, 201):
        prediction = model(x)
        loss = loss_fn(prediction, y)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        history.append(loss.item())
        if epoch % 50 == 0:
            print(f"эпоха {epoch:3d}: loss = {loss.item():.4f}")

    print(f"истина: w = {WEIGHT:.2f}, b = {BIAS:.2f}")
    print(f"модель: w = {model.weight.item():.2f}, b = {model.bias.item():.2f}")

    output_dir = Path("runs")
    output_dir.mkdir(exist_ok=True)
    figure, axes = plt.subplots(1, 2, figsize=(10, 4))
    axes[0].plot(history)
    axes[0].set(title="кривая обучения", xlabel="эпоха", ylabel="MSE")
    axes[1].scatter(x.numpy(), y.numpy(), s=4, label="данные")
    axes[1].plot(x.numpy(), model(x).detach().numpy(), color="red", label="модель")
    axes[1].set(title="подгонка", xlabel="x", ylabel="y")
    axes[1].legend()
    figure.tight_layout()
    figure.savefig(output_dir / "linear_regression.png", dpi=100)
    print(f"график сохранён: {output_dir / 'linear_regression.png'}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
