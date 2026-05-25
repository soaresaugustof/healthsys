import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

from flask import Flask, jsonify, request
from flask_cors import CORS
from prometheus_flask_exporter import PrometheusMetrics
import tempfile
import numpy as np
import classificador as clf

app = Flask(__name__)
CORS(app)
PrometheusMetrics(app)

model_loaded = False

def get_model():
    global model_loaded
    if not model_loaded:
        clf.model = clf.load_model('2409_2004i.h5', custom_objects={'loss': clf.weighted_loss})
        model_loaded = True
        print('[ai-service] Modelo Keras carregado.')
    return clf.model


@app.route('/', methods=['GET'])
def health():
    return 'OK', 200


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
            'detalhes': {
                label: f'{float(p * 100):.2f}%'
                for label, p in zip(clf.labels, predictions[0])
            }
        }), 200

    except Exception as e:
        print(f'[ai-service] Erro na classificação: {e}')
        return jsonify({'error': str(e)}), 500

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


port = int(os.environ.get('PORT', '8087'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=port)
