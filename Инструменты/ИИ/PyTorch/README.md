# PyTorch

Книга: **Обучение с подкреплением на PyTorch**. стр 21.

Docker-окружение с **Anaconda + Python 3 + PyTorch** для проверки примеров из книги.
Текущая папка монтируется внутрь контейнера как `/workspace`, поэтому все примеры,
ноутбуки и логи остаются на хосте и попадают в git.

## Что внутри

| Слой | Содержимое |
| --- | --- |
| База | `continuumio/anaconda3:2024.10-1` (conda, Python 3) |
| conda-окружение `rl` | Python 3.12, numpy, pandas, scipy, matplotlib, seaborn, scikit-learn, sympy, jupyterlab, opencv, ffmpeg, pytest |
| PyTorch | `torch`, `torchvision`, `torchaudio` — сборка **CPU** (`/whl/cpu`) |
| Дополнительно | gymnasium, tensorboard, tensorboardX, moviepy, imageio |

Окружение описано в `environment.yml` (conda) и `requirements.txt` (pip),
поэтому его можно пересобрать на любой машине одной командой.

## Быстрый старт

```bash
# 1. Собрать образ (один раз, 5-10 минут)
docker compose build

# 2. Проверить окружение: версии Python, PyTorch, библиотек + пример CartPole
docker compose run --rm pytorch python check_env.py
```

## Как проверять примеры

Готовые примеры в папке `examples/` (от простого к сложному):

| Файл | Что показывает |
| --- | --- |
| `examples/01_tensors.py` | тензоры, операции, автоград, ручной градиентный спуск |
| `examples/02_linear_regression.py` | `nn.Linear` + `MSELoss` + `SGD`, график обучения в `runs/` |
| `examples/03_cartpole_random.py` | CartPole со случайной политикой: цикл «наблюдение → действие → награда» |
| `examples/04_cartpole_reinforce.py` | policy gradient (REINFORCE): агент реально учится |

```bash
# запустить пример из книги
docker compose run --rm pytorch python examples/01_tensors.py

# пример с обучением (останавливается при достижении средней награды)
docker compose run --rm pytorch python examples/04_cartpole_reinforce.py --episodes 500

# свой файл: положите его в эту папку и передайте путь
docker compose run --rm pytorch python my_script.py
```

```bash
# интерактивная оболочка
docker compose run --rm pytorch bash

# одноразовая команда
docker compose run --rm pytorch python -c "import torch; print(torch.rand(2, 3))"
```

Ноутбуки (удобно для глав с визуализацией):

```bash
docker compose up jupyter
# открыть http://localhost:8888/lab?token=pytorch
```

Кривые обучения TensorBoard:

```bash
docker compose up tensorboard
# открыть http://localhost:6006
```

## Добавление пакетов

| Что нужно | Как сделать |
| --- | --- |
| conda-пакет | добавить в `environment.yml` → `docker compose build` |
| pip-пакет | добавить в `requirements.txt` → `docker compose build` |
| попробовать разово | `docker compose run --rm -u root pytorch conda install -y -c conda-forge <пакет>` |

Пересборка переиспользует кеш слоёв, поэтому повторный `build` занимает секунды,
если менялись только `requirements.txt` или `environment.yml`.

## Настройки

Параметры в `.env`:

- `UID` / `GID` — владелец файлов внутри контейнера; должны совпадать с `id -u` / `id -g`
   на хосте, чтобы созданные в контейнере файлы были вашими;
- `JUPYTER_TOKEN` — токен доступа к Jupyter Lab.

## GPU

На этой машине видеокарты нет, поэтому собрана CPU-сборка PyTorch.
Если появится GPU с драйвером NVIDIA и `nvidia-container-toolkit`, нужно:

1. в `Dockerfile` заменить индекс на CUDA-версию:
   `pip install --index-url https://download.pytorch.org/whl/cu126 torch torchvision torchaudio`;
2. в `docker-compose.yml` сервисам `pytorch` и `jupyter` добавить доступ к GPU:

```yaml
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

3. пересобрать: `docker compose build`.

## Полезные ссылки

- [PyTorch — установка](https://pytorch.org/get-started/locally/)
- [Индексы сборок PyTorch](https://download.pytorch.org/whl/)
- [Gymnasium — среды для обучения с подкреплением](https://gymnasium.farama.org/)
- [Образ Anaconda](https://hub.docker.com/r/continuumio/anaconda3)