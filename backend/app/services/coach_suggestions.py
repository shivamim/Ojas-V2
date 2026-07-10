SUGGESTIONS = {
    "severe_pain": [
        "Advise patient to take prescribed painkiller. Schedule OPD if no relief in 2 hours.",
        "Check if patient missed any medication dose. Counsel on compliance.",
        "Dr. {doctor} notified. Recommend wound review today."
    ],
    "fever": [
        "Ask patient to record temperature every 4 hours. Advise Dolo 650 if >99°F.",
        "Rule out infection. Ask about wound color/smell. Schedule visit if >101°F for 24h.",
        "Check antibiotic compliance. Possible drug resistance — flag to doctor."
    ],
    "no_reply": [
        "Call family member immediately. Patient may be non-ambulatory.",
        "Send Hindi voice note via WhatsApp. Elderly patients prefer voice.",
        "Flag for home visit if no response in 24 hours."
    ],
    "bleeding": [
        "URGENT: Ask patient to apply pressure. If active bleeding, send to emergency NOW.",
        "Check if patient removed dressing early. Reinstruct wound care protocol.",
        "Dr. {doctor} called for emergency review. Keep patient calm."
    ],
    "swelling": [
        "Elevate limb above heart level. Ice pack 15 mins every 2 hours.",
        "Check for deep vein thrombosis signs. Warmth + redness = urgent.",
        "If swelling increasing after Day 3, schedule Doppler scan."
    ]
}

def get_suggestions(trigger_type: str, doctor_name: str = "Doctor") -> list:
    base = SUGGESTIONS.get(trigger_type, SUGGESTIONS["no_reply"])
    return [s.replace("{doctor}", doctor_name) for s in base]
