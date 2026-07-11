"""
Multi-language WhatsApp template definitions for check-in messages.
Templates are keyed by language code and day number.
"""

TEMPLATES = {
    "en": {
        1: {
            "name": "checkin_day_1",
            "language_code": "en",
            "variables": ["patient_name"],
            "text": "Hi {patient_name}, welcome to Ojas Recovery Monitoring! You'll receive daily check-ins for 14 days. Reply to any message if you need help."
        },
        7: {
            "name": "checkin_day_7",
            "language_code": "en",
            "variables": ["patient_name"],
            "text": "Hi {patient_name}, Day 7 check-in: How is your wound healing? Please share pain level (0-4) and any fever/swelling."
        },
        "default": {
            "name": "checkin_daily",
            "language_code": "en",
            "variables": ["patient_name", "day"],
            "text": "Hi {patient_name}, Day {day} check-in: How are you feeling today? Reply with pain level (0-4) and any symptoms."
        }
    },
    "hi": {
        1: {
            "name": "checkin_day_1_hi",
            "language_code": "hi",
            "variables": ["patient_name"],
            "text": "नमस्ते {patient_name}, ओजस रिकवरी मॉनिटरिंग में आपका स्वागत है! आपको 14 दिनों तक दैनिक चेक-इन मिलेंगे।"
            # NOTE: Full Hindi translation pending - needs native speaker review before production use
        },
        7: {
            "name": "checkin_day_7_hi",
            "language_code": "hi",
            "variables": ["patient_name"],
            "text": "नमस्ते {patient_name}, दिन 7 का चेक-इन: आपका घाव कैसे भर रहा है?"
            # NOTE: Full Hindi translation pending - needs native speaker review before production use
        },
        "default": {
            "name": "checkin_daily_hi",
            "language_code": "hi",
            "variables": ["patient_name", "day"],
            "text": "नमस्ते {patient_name}, दिन {day} का चेक-इन: आज आप कैसा महसूस कर रहे हैं?"
            # NOTE: Full Hindi translation pending - needs native speaker review before production use
        }
    },
    "ta": {
        "default": {
            "name": "checkin_daily_ta",
            "language_code": "ta",
            "variables": ["patient_name", "day"],
            "text": ""  # translation pending, do not send until filled in
        }
    },
    "te": {
        "default": {
            "name": "checkin_daily_te",
            "language_code": "te",
            "variables": ["patient_name", "day"],
            "text": ""  # translation pending, do not send until filled in
        }
    },
    "bn": {
        "default": {
            "name": "checkin_daily_bn",
            "language_code": "bn",
            "variables": ["patient_name", "day"],
            "text": ""  # translation pending, do not send until filled in
        }
    },
    "mr": {
        "default": {
            "name": "checkin_daily_mr",
            "language_code": "mr",
            "variables": ["patient_name", "day"],
            "text": ""  # translation pending, do not send until filled in
        }
    }
}


def get_template(language_code: str, day: int) -> dict:
    """
    Get template for given language and day.
    Falls back to English default if language/day not found.
    """
    lang_templates = TEMPLATES.get(language_code, TEMPLATES["en"])
    
    if day in lang_templates:
        return lang_templates[day]
    
    return lang_templates.get("default", TEMPLATES["en"]["default"])


def format_template(template: dict, variables: dict) -> str:
    """
    Format template text with provided variables.
    Example: format_template(template, {"patient_name": "Rahul", "day": "5"})
    """
    text = template.get("text", "")
    for key, value in variables.items():
        text = text.replace(f"{{{key}}}", str(value))
    return text
