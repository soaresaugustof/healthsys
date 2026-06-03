import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

from flask import Flask, jsonify, request
from flask_cors import CORS
from prometheus_flask_exporter import PrometheusMetrics
import tempfile
import numpy as np
from datetime import datetime, timedelta

import db
import classificador as clf
from models.knn import KNN
from models.regressao_linear import RegressaoLinear

app = Flask(__name__)
CORS(app)
PrometheusMetrics(app)

RISCO_MAP = {
    'VERMELHO': 0, 'Vermelho': 0, 'vermelho': 0,
    'LARANJA':  1, 'Laranja':  1, 'laranja':  1,
    'AMARELO':  2, 'Amarelo':  2, 'amarelo':  2,
    'VERDE':    3, 'Verde':    3, 'verde':    3,
    'AZUL':     4, 'Azul':     4, 'azul':     4,
}
RISCO_LABELS = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul']
RISCO_COLORS = {
    'Vermelho': '#f43f5e', 'Laranja': '#f97316',
    'Amarelo': '#fbbf24', 'Verde': '#10b981', 'Azul': '#3b82f6',
}

model_loaded = False


def encode_risk(r) -> int:
    if isinstance(r, int):
        return r if 0 <= r <= 4 else -1
    return RISCO_MAP.get(str(r), -1)


def get_model():
    global model_loaded
    if not model_loaded:
        clf.model = clf.load_model('2409_2004i.h5', custom_objects={'loss': clf.weighted_loss})
        model_loaded = True
        print('[data-service] Modelo Keras carregado.')
    return clf.model


@app.route('/', methods=['GET'])
def health():
    return 'OK', 200


# ── AI — classificação de imagem ─────────────────────────────────────────────

@app.route('/api/ai/classify', methods=['POST'])
def classify():
    if 'imagem' not in request.files:
        return jsonify({'error': 'Nenhuma imagem enviada'}), 400
    file = request.files['imagem']
    if not file or not file.filename:
        return jsonify({'error': 'Arquivo inválido'}), 400
    temp_path = None
    try:
        suffix = os.path.splitext(file.filename)[1] or '.png'
        fd, temp_path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        file.save(temp_path)
        img = clf.preprocess_image_with_generator(temp_path, target_size=(320, 320))
        model = get_model()
        predictions = model.predict(img)
        diagnostico = clf.labels[np.argmax(predictions[0])]
        probabilidade = float(np.max(predictions[0]))
        return jsonify({
            'diagnostico': diagnostico,
            'probabilidade': f'{probabilidade * 100:.2f}%',
            'detalhes': {label: f'{float(p * 100):.2f}%' for label, p in zip(clf.labels, predictions[0])}
        }), 200
    except Exception as e:
        print(f'[data-service] Erro na classificação: {e}')
        return jsonify({'error': str(e)}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


# ── Analytics — visão geral ──────────────────────────────────────────────────

@app.route('/api/analytics/overview', methods=['GET'])
def overview():
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM pacientes")
        total_pacientes = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM triagens")
        total_triagens = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM triagens WHERE data::date = CURRENT_DATE")
        triagens_hoje = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM internacoes WHERE status = 'ATIVO'")
        internacoes_ativas = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM leitos")
        total_leitos = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM leitos WHERE status = 'OCUPADO'")
        leitos_ocupados = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM exames WHERE status = 'SOLICITADO'")
        exames_pendentes = cur.fetchone()[0]
        return jsonify({
            'totalPacientes': total_pacientes, 'totalTriagens': total_triagens,
            'triagensHoje': triagens_hoje, 'internacoesAtivas': internacoes_ativas,
            'totalLeitos': total_leitos, 'leitosOcupados': leitos_ocupados,
            'ocupacaoLeitos': round(leitos_ocupados / total_leitos * 100, 1) if total_leitos else 0,
            'examesPendentes': exames_pendentes,
        })
    finally:
        conn.close()


@app.route('/api/analytics/triage/distribuicao', methods=['GET'])
def triage_distribuicao():
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT nivel_risco, COUNT(*) AS total FROM triagens GROUP BY nivel_risco ORDER BY total DESC")
        rows = cur.fetchall()
        result = []
        for risk, count in rows:
            label = RISCO_LABELS[encode_risk(risk)] if encode_risk(risk) >= 0 else str(risk)
            result.append({'name': label, 'value': count, 'color': RISCO_COLORS.get(label, '#94a3b8')})
        return jsonify(result)
    finally:
        conn.close()


@app.route('/api/analytics/triage/volume', methods=['GET'])
def triage_volume():
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT data::date AS dia, COUNT(*) AS total FROM triagens
            WHERE data >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY dia ORDER BY dia
        """)
        rows = cur.fetchall()
        historico = [{'data': str(r[0]), 'total': int(r[1])} for r in rows]
        N_LAGS = min(3, len(rows) - 2)
        if N_LAGS < 1:
            return jsonify({'historico': historico, 'projecao': [], 'semDados': True})
        y = np.array([r[1] for r in rows], dtype=float)
        ultima_data = rows[-1][0]
        X_lag = np.array([[y[i - j] for j in range(1, N_LAGS + 1)] for i in range(N_LAGS, len(y))])
        y_lag = y[N_LAGS:]
        reg = RegressaoLinear()
        reg.fit(X_lag, y_lag)
        k = min(3, len(X_lag))
        knn = KNN(k=k, task='regression')
        knn.fit(X_lag, y_lag)
        buf_reg, buf_knn = list(y), list(y)
        projecao = []
        for i in range(7):
            x_reg = np.array([[buf_reg[-j] for j in range(1, N_LAGS + 1)]])
            x_knn = np.array([[buf_knn[-j] for j in range(1, N_LAGS + 1)]])
            pred_reg = max(0.0, float(reg.predict(x_reg)[0]))
            pred_knn = max(0.0, float(knn.predict(x_knn)[0]))
            buf_reg.append(pred_reg)
            buf_knn.append(pred_knn)
            projecao.append({'data': str(ultima_data + timedelta(days=i + 1)),
                             'regressaoLinear': round(pred_reg, 1), 'knn': round(pred_knn, 1)})
        return jsonify({'historico': historico, 'projecao': projecao,
                        'modelos': f'AR({N_LAGS}) — Regressão Linear e KNN k={k}'})
    finally:
        conn.close()


@app.route('/api/analytics/triage/risco-hora', methods=['GET'])
def triage_risco_hora():
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT EXTRACT(HOUR FROM data)::int, EXTRACT(DOW FROM data)::int, nivel_risco FROM triagens
        """)
        rows = cur.fetchall()
        samples = [(int(h), int(d), encode_risk(r)) for h, d, r in rows if encode_risk(r) >= 0]
        if len(samples) < 10:
            return jsonify({'dados': [], 'semDados': True})
        X_train = np.array([[h, d] for h, d, _ in samples])
        y_train = np.array([r for _, _, r in samples])
        today_dow = (datetime.now().weekday() + 1) % 7
        k = min(5, len(samples))
        knn = KNN(k=k, task='classification')
        knn.fit(X_train, y_train)
        preds = knn.predict(np.array([[h, today_dow] for h in range(24)]))
        resultado = []
        for hora, pred in enumerate(preds):
            idx = int(pred)
            label = RISCO_LABELS[idx] if 0 <= idx < len(RISCO_LABELS) else 'Desconhecido'
            resultado.append({'hora': hora, 'riscoEsperado': label, 'cor': RISCO_COLORS.get(label, '#94a3b8')})
        return jsonify({'dados': resultado, 'modelo': f'KNN k={k}', 'semDados': False})
    finally:
        conn.close()


@app.route('/api/analytics/beds/ocupacao', methods=['GET'])
def beds_ocupacao():
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT setor,
                   COUNT(*) FILTER (WHERE status = 'DISPONIVEL'),
                   COUNT(*) FILTER (WHERE status = 'OCUPADO'),
                   COUNT(*) FILTER (WHERE status = 'MANUTENCAO'),
                   COUNT(*)
            FROM leitos GROUP BY setor ORDER BY setor
        """)
        rows = cur.fetchall()
        return jsonify([{
            'setor': s, 'disponiveis': int(d), 'ocupados': int(o), 'manutencao': int(m), 'total': int(t),
            'pctOcupacao': round(int(o) / int(t) * 100, 1) if t else 0,
        } for s, d, o, m, t in rows])
    finally:
        conn.close()


@app.route('/api/analytics/exames/diagnosticos', methods=['GET'])
def exames_diagnosticos():
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT resultado FROM exames WHERE resultado LIKE '%Diagnóstico principal:%'")
        contagem: dict[str, int] = {}
        for (resultado,) in cur.fetchall():
            if not resultado:
                continue
            for line in resultado.split('\n'):
                if 'Diagnóstico principal:' in line:
                    diag = line.split('Diagnóstico principal:')[-1].strip()
                    contagem[diag] = contagem.get(diag, 0) + 1
                    break
        top = sorted(contagem.items(), key=lambda x: -x[1])[:10]
        return jsonify([{'diagnostico': d, 'total': t} for d, t in top])
    finally:
        conn.close()


port = int(os.environ.get('PORT', '8088'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=port)
