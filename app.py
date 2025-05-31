from flask import Flask, render_template, request, jsonify
import pandas as pd
import joblib

app = Flask(__name__)

df = pd.read_csv('Plastic-waste-web/data/Plastic Waste Around the World.csv')
model_pipeline = joblib.load('Plastic-waste-web/best_model_pipeline.pkl')
le_target = joblib.load('Plastic-waste-web/le_coastal_risk.pkl')

@app.route('/')
def index():
    main_sources = sorted(df['Main_Sources'].unique())
    return render_template('index.html', main_sources=main_sources)

@app.route('/api/data')
def api_data():
    data = df.to_dict(orient='records')
    return jsonify(data)

@app.route('/api/predict', methods=['POST'])
def api_predict():
    data = request.get_json()
    try:
        input_df = pd.DataFrame([data])
        pred_encoded = model_pipeline.predict(input_df)[0]
        pred_label = le_target.inverse_transform([pred_encoded])[0]
        pred_probs = model_pipeline.predict_proba(input_df)[0]
        prob_dict = {cls: round(prob, 3) for cls, prob in zip(le_target.classes_, pred_probs)}
        return jsonify({'success': True, 'prediction': pred_label, 'probabilities': prob_dict})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)
