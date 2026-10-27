FROM python:3.12.9-slim AS deps
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12.9-slim
WORKDIR /app
COPY --from=deps /install /usr/local
COPY --chown=65532:65532 app.py ./
USER 65532:65532
EXPOSE 8000
CMD ["python", "app.py"]
