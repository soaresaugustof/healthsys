from flask import Flask, jsonify
from flask_cors import CORS
from prometheus_flask_exporter import PrometheusMetrics
import os
import numpy as np
from datetime import datetime, timedelta

import db
from models.knn import KNN
from models.regressao_linear import RegressaoLinear

app = Flask(__name__)
CORS(app)
PrometheusMetrics(app)

# Mapeamento de nível de risco (enum name ou label → índice 0-4)
RISCO_MAP = {
    'VERMELHO': 0, 'Vermelho': 0, 'vermelho': 0,
    'LARANJA':  1, 'Laranja':  1, 'laranja':  1,
    'AMARELO':  2, 'Amarelo':  2, 'amarelo':  2,
    'VERDE':    3, 'Verde':    3, 'verde':    3,
    'AZUL':     4, 'Azul':     4, 'azul':     4,
}
RISCO_LABELS  = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul']
RISCO_COLORS  = {
    'Vermelho': '#f43f5e',
    'Laranja':  '#f97316',
    'Amarelo':  '#fbbf24',
    'Verde':    '#10b981',
    'Azul':     '#3b82f6',
}


def encode_risk(r) -> int:
    """Converte qualquer representação de NivelRisco para índice 0-4."""
    if isinstance(r, int):
        return r if 0 <= r <= 4 else -1
    return RISCO_MAP.get(str(r), -1)


@app.route('/', methods=['GET'])
def health():
    return 'OK', 200


# ── Visão geral ──────────────────────────────────────────────────────────────

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
            'totalPacientes':    total_pacientes,
            'totalTriagens':     total_triagens,
            'triagensHoje':      triagens_hoje,
            'internacoesAtivas': internacoes_ativas,
            'totalLeitos':       total_leitos,
            'leitosOcupados':    leitos_ocupados,
            'ocupacaoLeitos':    round(leitos_ocupados / total_leitos * 100, 1) if total_leitos else 0,
            'examesPendentes':   exames_pendentes,
        })
    finally:
        conn.close()


# ── Triagem — distribuição por risco ─────────────────────────────────────────

@app.route('/api/analytics/triage/distribuicao', methods=['GET'])
def triage_distribuicao():
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT nivel_risco, COUNT(*) AS total
            FROM triagens
            GROUP BY nivel_risco
            ORDER BY total DESC
        """)
        rows = cur.fetchall()

        result = []
        for risk, count in rows:
            label = RISCO_LABELS[encode_risk(risk)] if encode_risk(risk) >= 0 else str(risk)
            result.append({
                'name':  label,
                'value': count,
                'color': RISCO_COLORS.get(label, '#94a3b8'),
            })
        return jsonify(result)
    finally:
        conn.close()


# ── Triagem — volume diário + projeção (Regressão Linear vs KNN) ─────────────

@app.route('/api/analytics/triage/volume', methods=['GET'])
def triage_volume():
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT data::date AS dia, COUNT(*) AS total
            FROM triagens
            WHERE data >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY dia
            ORDER BY dia
        """)
        rows = cur.fetchall()

        historico = [{'data': str(r[0]), 'total': int(r[1])} for r in rows]

        # Usa o máximo de lags possível até 3; precisa de pelo menos 1 amostra de treino
        N_LAGS = min(3, len(rows) - 2)

        if N_LAGS < 1:
            return jsonify({'historico': historico, 'projecao': [], 'semDados': True})

        y = np.array([r[1] for r in rows], dtype=float)
        ultima_data = rows[-1][0]

        # Lag feature matrix: cada linha = [y[t-1], y[t-2], y[t-3]], alvo = y[t]
        X_lag = np.array(
            [[y[i - j] for j in range(1, N_LAGS + 1)] for i in range(N_LAGS, len(y))]
        )
        y_lag = y[N_LAGS:]

        reg = RegressaoLinear()
        reg.fit(X_lag, y_lag)

        k = min(3, len(X_lag))
        knn = KNN(k=k, task='regression')
        knn.fit(X_lag, y_lag)

        # Previsão multi-passo: cada modelo mantém seu próprio buffer para não contaminar
        buf_reg = list(y)
        buf_knn = list(y)
        projecao = []
        for i in range(7):
            x_reg = np.array([[buf_reg[-j] for j in range(1, N_LAGS + 1)]])
            x_knn = np.array([[buf_knn[-j] for j in range(1, N_LAGS + 1)]])

            pred_reg = max(0.0, float(reg.predict(x_reg)[0]))
            pred_knn = max(0.0, float(knn.predict(x_knn)[0]))

            buf_reg.append(pred_reg)
            buf_knn.append(pred_knn)

            dia = ultima_data + timedelta(days=i + 1)
            projecao.append({
                'data':            str(dia),
                'regressaoLinear': round(pred_reg, 1),
                'knn':             round(pred_knn, 1),
            })

        return jsonify({
            'historico': historico,
            'projecao':  projecao,
            'modelos':   f'AR({N_LAGS}) — Regressão Linear e KNN k={k}',
        })
    finally:
        conn.close()


# ── Triagem — risco esperado por hora (KNN classificação) ────────────────────

@app.route('/api/analytics/triage/risco-hora', methods=['GET'])
def triage_risco_hora():
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        # DOW: 0=domingo, 6=sábado (padrão PostgreSQL EXTRACT)
        cur.execute("""
            SELECT EXTRACT(HOUR FROM data)::int AS hora,
                   EXTRACT(DOW  FROM data)::int AS dow,
                   nivel_risco
            FROM triagens
        """)
        rows = cur.fetchall()

        samples = [(int(h), int(d), encode_risk(r)) for h, d, r in rows if encode_risk(r) >= 0]

        if len(samples) < 10:
            return jsonify({'dados': [], 'semDados': True})

        X_train = np.array([[h, d] for h, d, _ in samples])
        y_train = np.array([r for _, _, r in samples])

        # Python weekday(): 0=seg..6=dom → converter para escala SQL (0=dom..6=sab)
        today_dow = (datetime.now().weekday() + 1) % 7
        k = min(5, len(samples))
        knn = KNN(k=k, task='classification')
        knn.fit(X_train, y_train)

        X_pred = np.array([[h, today_dow] for h in range(24)])
        preds  = knn.predict(X_pred)

        resultado = []
        for hora, pred in enumerate(preds):
            idx = int(pred)
            label = RISCO_LABELS[idx] if 0 <= idx < len(RISCO_LABELS) else 'Desconhecido'
            resultado.append({
                'hora':         hora,
                'riscoEsperado': label,
                'cor':          RISCO_COLORS.get(label, '#94a3b8'),
            })

        return jsonify({'dados': resultado, 'modelo': f'KNN k={k}', 'semDados': False})
    finally:
        conn.close()


# ── Leitos — ocupação por setor ──────────────────────────────────────────────

@app.route('/api/analytics/beds/ocupacao', methods=['GET'])
def beds_ocupacao():
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT setor,
                   COUNT(*) FILTER (WHERE status = 'DISPONIVEL') AS disponiveis,
                   COUNT(*) FILTER (WHERE status = 'OCUPADO')    AS ocupados,
                   COUNT(*) FILTER (WHERE status = 'MANUTENCAO') AS manutencao,
                   COUNT(*)                                       AS total
            FROM leitos
            GROUP BY setor
            ORDER BY setor
        """)
        rows = cur.fetchall()

        result = []
        for setor, disp, ocup, manut, total in rows:
            result.append({
                'setor':       setor,
                'disponiveis': int(disp),
                'ocupados':    int(ocup),
                'manutencao':  int(manut),
                'total':       int(total),
                'pctOcupacao': round(int(ocup) / int(total) * 100, 1) if total else 0,
            })
        return jsonify(result)
    finally:
        conn.close()


# ── Exames — top diagnósticos do ai-service ──────────────────────────────────

@app.route('/api/analytics/exames/diagnosticos', methods=['GET'])
def exames_diagnosticos():
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT resultado FROM exames
            WHERE resultado LIKE '%Diagnóstico principal:%'
        """)
        rows = cur.fetchall()

        contagem: dict[str, int] = {}
        for (resultado,) in rows:
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
