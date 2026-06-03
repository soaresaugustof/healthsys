FROM python:3.10-slim

WORKDIR /app

COPY analytics-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY analytics-service/ .
COPY ai-service/classificador.py .
COPY ai-service/2409_2004i.h5 .

EXPOSE 8088

CMD ["gunicorn", "main:app", "--bind", "0.0.0.0:8088", "--timeout", "120", "--workers", "1"]
