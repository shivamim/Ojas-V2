def predict_readmission_risk(patient, missed_count: int = 0, open_escalations: int = 0) -> str:
    risk = 0
    if patient.age > 65: risk += 20
    if patient.age > 75: risk += 15
    if "cardiac" in (patient.surgery_type or "").lower(): risk += 25
    if "ortho" in (patient.surgery_type or "").lower() and patient.age > 60: risk += 15
    if missed_count > 2: risk += 30
    if open_escalations > 0: risk += 25
    if patient.response_rate < 40: risk += 20
    return "HIGH" if risk > 60 else "MEDIUM" if risk > 35 else "LOW"
