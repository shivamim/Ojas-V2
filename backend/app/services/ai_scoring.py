def calculate_risk_score(checkin_data: dict, patient_history: dict = None) -> dict:
    score = 0
    reasons = []
    responses = checkin_data.get("responses", {})

    pain = responses.get("pain", "0")
    if pain in ["3", "4", "5"]:
        score += 40
        reasons.append("Severe pain reported")
    elif pain in ["2"]:
        score += 20
        reasons.append("Moderate pain")

    if responses.get("fever") == "yes":
        score += 30
        reasons.append("Fever detected")
    if responses.get("swelling") == "yes":
        score += 20
        reasons.append("Swelling reported")
    if responses.get("bleeding") == "yes":
        score += 50
        reasons.append("Bleeding reported — CRITICAL")
    if responses.get("breathing") == "yes":
        score += 60
        reasons.append("Breathing difficulty — CRITICAL")

    text = responses.get("free_text", "").lower()
    critical_keywords = ["severe", "bahut dard", "can't breathe", "fainting", "blood", "chakkar", "maut", "khoon", "bukhar"]
    for kw in critical_keywords:
        if kw in text:
            score += 25
            reasons.append(f"Critical keyword detected: {kw}")

    if patient_history:
        if patient_history.get("response_rate", 100) < 50:
            score += 15
            reasons.append("Low engagement history")

    level = "CRITICAL" if score >= 70 else "HIGH" if score >= 50 else "MEDIUM" if score >= 30 else "LOW"
    return {"score": min(score, 100), "level": level, "reasons": reasons}
