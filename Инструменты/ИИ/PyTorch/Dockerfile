# Окружение для проверки примеров из книги по PyTorch.
# База: Anaconda (Python 3 + conda + набор библиотек для анализа данных).
FROM continuumio/anaconda3:2024.10-1

# UID/GID пользователя внутри контейнера.
# Значения по умолчанию совпадают с первым пользователем Linux (1000),
# поэтому файлы, созданные в контейнере, останутся вашими на хосте.
ARG UID=1000
ARG GID=1000

ENV DEBIAN_FRONTEND=noninteractive \
    CONDA_DIR=/opt/conda \
    ENV_NAME=rl \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MPLBACKEND=Agg \
    TZ=Europe/Moscow

# Системные зависимости:
#   build-essential, swig — сборка пакетов из исходников;
#   git, curl, ffmpeg      — работа с примерами и запись видео эпизодов;
#   libgl1/libglib/...     — OpenCV и рендер сред без дисплея;
#   xvfb                   — виртуальный дисплей для визуализации сред;
#   graphviz               — схемы моделей (torchviz / torchinfo).
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        git \
        curl \
        ca-certificates \
        ffmpeg \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        swig \
        xvfb \
        graphviz \
    && rm -rf /var/lib/apt/lists/*

# conda-окружение с Python 3 (пакеты описаны в environment.yml).
COPY environment.yml /tmp/environment.yml
RUN conda env create -f /tmp/environment.yml \
    && conda clean -afy \
    && rm -f /tmp/environment.yml

# Делаем окружение rl окружением по умолчанию: python/pip/jupyter берутся из него.
ENV PATH=${CONDA_DIR}/envs/${ENV_NAME}/bin:${CONDA_DIR}/bin:$PATH \
    CONDA_DEFAULT_ENV=${ENV_NAME}

# PyTorch. Индекс /whl/cpu — сборка без CUDA (на этой машине GPU нет).
# Для GPU замените на /whl/cu126 (или другой cuXXX) и добавьте доступ к видеокарте.
RUN pip install --index-url https://download.pytorch.org/whl/cpu \
        torch torchvision torchaudio

# Дополнительные пакеты для примеров из книги.
COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt && rm -f /tmp/requirements.txt

# Пользователь без root: файлы, созданные в контейнере, принадлежат вам на хосте.
RUN groupadd -g ${GID} dev \
    && useradd -m -u ${UID} -g ${GID} -s /bin/bash dev \
    && mkdir -p /workspace \
    && chown -R ${UID}:${GID} /workspace /home/dev \
    && printf '. %s/etc/profile.d/conda.sh\nconda activate %s\n' "${CONDA_DIR}" "${ENV_NAME}" >> /home/dev/.bashrc

USER dev
WORKDIR /workspace

CMD ["bash"]
