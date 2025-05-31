import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
import xgboost as xgb
import joblib

def evaluate_model(model, X_train, y_train, X_test, y_test, target_names, model_name):
    """Helper function to evaluate and print model performance"""
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\n{model_name} Model Evaluation")
    print("-" * 40)
    print(f"Accuracy: {accuracy:.2f}\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred, target_names=target_names, digits=2))

# Load dataset
df = pd.read_csv('data/Plastic Waste Around the World.csv')

# Encode target variable
le_target = LabelEncoder()
df['Coastal_Waste_Risk_enc'] = le_target.fit_transform(df['Coastal_Waste_Risk'])
target_names = le_target.classes_  # Get original class names

# Features and target
X = df[['Total_Plastic_Waste_MT', 'Main_Sources', 'Recycling_Rate', 'Per_Capita_Waste_KG']]
y = df['Coastal_Waste_Risk_enc']

# Train/test split with stratification
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y)

# Define preprocessing
numeric_features = ['Total_Plastic_Waste_MT', 'Recycling_Rate', 'Per_Capita_Waste_KG']
categorical_features = ['Main_Sources']

preprocessor = ColumnTransformer(transformers=[
    ('num', StandardScaler(), numeric_features),
    ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
])

# Define models with proper display names
models = {
    'XGBoost': xgb.XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', random_state=42),
    'RandomForest': RandomForestClassifier(random_state=42),
    'SVM': SVC(probability=True, random_state=42)  # This is the SVM model
}

best_accuracy = 0
best_model_name = None
best_pipeline = None

print("Model Evaluation Results")
print("=" * 40)

# Train and evaluate each model with preprocessing pipeline
for name, model in models.items():
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', model)
    ])
    
    pipeline.fit(X_train, y_train)
    
    # Evaluate and print results with proper model name
    evaluate_model(pipeline, X_train, y_train, X_test, y_test, target_names, name)
    
    # Check if this is the best model
    current_accuracy = accuracy_score(y_test, pipeline.predict(X_test))
    if current_accuracy > best_accuracy:
        best_accuracy = current_accuracy
        best_model_name = name
        best_pipeline = pipeline

print(f"\nBest model: {best_model_name} with accuracy {best_accuracy:.4f}")

# Save best pipeline (model + preprocessing)
joblib.dump(best_pipeline, 'best_model_pipeline.pkl')

# Save label encoder for target variable
joblib.dump(le_target, 'le_coastal_risk.pkl')

print('\nSaved best model pipeline and target label encoder.')