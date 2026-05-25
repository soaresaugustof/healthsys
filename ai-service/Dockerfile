FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py classificador.py 2409_2004i.h5 ./

EXPOSE 8087

# Timeout 120s para aguentar o primeiro request (lazy-load do modelo ~5-10s)
CMD ["gunicorn", "main:app", "--bind", "0.0.0.0:8087", "--timeout", "120", "--workers", "1"]
