#!/usr/bin/env python3
"""Проверка окружения: Python, conda, PyTorch и библиотеки для примеров из книги.

Запуск:
    docker compose run --rm pytorch python check_env.py
"""

from __future__ import annotations

import importlib
import os
import platform
import sys


def print_lib(name: str) -> str:
    """Печатает версию библиотеки, если она установлена."""
    try:
        module = importlib.import_module(name)
    except ImportError:
        print(f"  {name:<14} НЕ УСТАНОВЛЕН")
        return ""
    version = getattr(module, "__version__", "неизвестно")
    print(f"  {name:<14} {version}")
    return version


def check_torch() -> bool:
    """Проверяет PyTorch реальным вычислением."""
    try:
        import torch
    except ImportError:
        print("PyTorch не установлен — окружение собрано неправильно")
        return False

    print(f"  torch          {torch.__version__}")
    print(f"  cuda           доступна: {torch.cuda.is_available()}")
    print(f"  потоков CPU    {torch.get_num_threads()}")

    left = torch.rand(64, 32)
    right = torch.rand(32, 16)
    product = left @ right
    print(f"  проверка       {tuple(left.shape)} @ {tuple(right.shape)} -> {tuple(product.shape)}")
    print(f"  устройство     {product.device}")
    return True


def check_gymnasium() -> None:
    """Проверяет среду из gymnasium (типичный пример из книги)."""
    try:
        import gymnasium as gym
    except ImportError:
        print("  gymnasium      НЕ УСТАНОВЛЕН")
        return

    env = gym.make("CartPole-v1")
    observation, _ = env.reset(seed=0)
    action = env.action_space.sample()
    _, reward, terminated, truncated, _ = env.step(action)
    env.close()
    print(f"  CartPole-v1    наблюдение {observation.shape}, награда {reward}, "
          f"terminated={terminated}, truncated={truncated}")


def main() -> int:
    print("=== Python ===")
    print(f"  версия         {platform.python_version()}")
    print(f"  исполняемый    {sys.executable}")
    print(f"  conda env      {os.environ.get('CONDA_DEFAULT_ENV', 'нет')}")

    print("=== Библиотеки ===")
    for name in ("numpy", "pandas", "matplotlib", "scipy", "sklearn", "cv2",
                 "jupyterlab", "tensorboard"):
        print_lib(name)

    print("=== PyTorch ===")
    torch_ok = check_torch()
    print_lib("torchvision")
    print_lib("torchaudio")

    print("=== Пример из книги ===")
    check_gymnasium()

    print()
    print("Окружение готово." if torch_ok else "Окружение не готово.")
    return 0 if torch_ok else 1


if __name__ == "__main__":
    sys.exit(main())
