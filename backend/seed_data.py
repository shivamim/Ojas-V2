import asyncio
import uuid
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.core.encryption import encrypt_field


def safe_hash(password: str) -> str:
    """Bcrypt has a 72-byte limit. Truncate safely before hashing."""
    return get_password_hash(password[:72])


async def seed(db: AsyncSession = None):
    close_session = False
    if db is None:
        db = AsyncSessionLocal()
        close_session = True

    try:
        from app.models.user import User
        result = await db.execute(
            select(User).where(User.email == "admin@ojas.care")
        )
        if result.scalar_one_or_none():
            print("✅ Seed data already exists, skipping")
            return

        from app.models.hospital import Hospital
        from app.models.patient import Patient
        from app.models.checkin import CheckIn
        from app.models.escalation import Escalation
        from app.models.timeline import TimelineEvent

        superadmin = User(
            id=uuid.uuid4(),
            email="admin@ojas.care",
            hashed_password=safe_hash("admin123"),
            full_name="System Superadmin",
            role="SUPER_ADMIN",
            hospital_id=None,
            is_active=True
        )
        db.add(superadmin)

        hospital = Hospital(
            id=uuid.uuid4(),
            name="City Hospital",
            city="Ghaziabad",
            state="Uttar Pradesh",
            bed_count=200,
            nabh_level="Entry Level",
            contact_email=encrypt_field("admin@cityhospital.com"),
            contact_phone=encrypt_field("+91-120-4567890"),
            plan_type="professional",
            is_active=True
        )
        db.add(hospital)
        await db.flush()

        nurse = User(
            id=uuid.uuid4(),
            email="nurse@cityhospital.com",
            hashed_password=safe_hash("nurse123"),
            full_name="Nurse Anita",
            role="COORDINATOR",
            hospital_id=hospital.id,
            is_active=True
        )
        doctor = User(
            id=uuid.uuid4(),
            email="dr.gupta@cityhospital.com",
            hashed_password=safe_hash("doctor123"),
            full_name="Dr. Gupta",
            role="DOCTOR",
            hospital_id=hospital.id,
            is_active=True
        )
        db.add(nurse)
        db.add(doctor)

        patients_data = [
            {"name": "Rajesh Sharma", "mobile": "+91-98765-43210", "family": "+91-98765-43211", "age": 62, "surgery": "Total Knee Replacement", "doctor": "Dr. Gupta", "specialty": "Orthopedics", "discharge": date(2026, 5, 10), "status": "ESCALATED", "day": 6, "bed": "Ward-4B-12", "uhid": "UHID-2026-0042", "risk_score": 85, "risk_level": "HIGH", "readmission_risk": "HIGH"},
            {"name": "Priya Nair", "mobile": "+91-98765-43220", "family": "+91-98765-43221", "age": 45, "surgery": "Laparoscopic Cholecystectomy", "doctor": "Dr. Menon", "specialty": "General Surgery", "discharge": date(2026, 5, 6), "status": "ACTIVE", "day": 10, "bed": "Ward-3A-05", "uhid": "UHID-2026-0041", "risk_score": 25, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Sunita Devi", "mobile": "+91-98765-43230", "family": "+91-98765-43231", "age": 68, "surgery": "CABG", "doctor": "Dr. Reddy", "specialty": "Cardiac Surgery", "discharge": date(2026, 5, 8), "status": "NO_REPLY", "day": 8, "bed": "ICU-12", "uhid": "UHID-2026-0038", "risk_score": 70, "risk_level": "HIGH", "readmission_risk": "HIGH"},
            {"name": "Amit Joshi", "mobile": "+91-98765-43240", "family": "+91-98765-43241", "age": 34, "surgery": "Appendectomy", "doctor": "Dr. Khan", "specialty": "General Surgery", "discharge": date(2026, 5, 3), "status": "ACTIVE", "day": 13, "bed": "Ward-2C-08", "uhid": "UHID-2026-0035", "risk_score": 15, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Fatima Begum", "mobile": "+91-98765-43250", "family": "+91-98765-43251", "age": 55, "surgery": "Total Hip Replacement", "doctor": "Dr. Gupta", "specialty": "Orthopedics", "discharge": date(2026, 5, 1), "status": "COMPLETED", "day": 14, "bed": "Ward-4B-15", "uhid": "UHID-2026-0032", "risk_score": 10, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Vikram Patel", "mobile": "+91-98765-43260", "family": "+91-98765-43261", "age": 48, "surgery": "Hernia Repair", "doctor": "Dr. Menon", "specialty": "General Surgery", "discharge": date(2026, 5, 9), "status": "ESCALATED", "day": 7, "bed": "Ward-3A-10", "uhid": "UHID-2026-0036", "risk_score": 75, "risk_level": "HIGH", "readmission_risk": "MEDIUM"},
            {"name": "Ramesh Iyer", "mobile": "+91-98765-43270", "family": "+91-98765-43271", "age": 58, "surgery": "Spinal Surgery", "doctor": "Dr. Khan", "specialty": "Neurosurgery", "discharge": date(2026, 5, 11), "status": "NO_REPLY", "day": 5, "bed": "Ward-5D-03", "uhid": "UHID-2026-0033", "risk_score": 55, "risk_level": "MEDIUM", "readmission_risk": "MEDIUM"},
        ]

        for pdata in patients_data:
            discharge_dt = datetime.combine(pdata["discharge"], datetime.min.time())
            
            patient = Patient(
                id=uuid.uuid4(),
                hospital_id=hospital.id,
                full_name=encrypt_field(pdata["name"]),
                mobile=encrypt_field(pdata["mobile"]),
                family_mobile=encrypt_field(pdata["family"]),
                age=pdata["age"],
                surgery_type=pdata["surgery"],
                discharge_date=discharge_dt,
                doctor_name=encrypt_field(pdata["doctor"]),
                doctor_specialty=pdata["specialty"],
                bed_number=encrypt_field(pdata["bed"]),
                uhid=encrypt_field(pdata["uhid"]),
                status=pdata["status"],
                current_day=pdata["day"],
                total_days=14,
                instructions="Keep wound dry. Take Dolo 650 if pain. Walk 10 minutes twice daily.",
                response_rate=85 if pdata["status"] == "ACTIVE" else 60 if pdata["status"] == "COMPLETED" else 30,
                risk_score=pdata["risk_score"],
                risk_level=pdata["risk_level"],
                readmission_risk=pdata["readmission_risk"]
            )
            db.add(patient)
            await db.flush()

            base_sent = discharge_dt.replace(hour=10, minute=0)
            
            for d in range(1, 15):
                if d < pdata["day"]:
                    cstatus = "COMPLETED"
                elif d == pdata["day"]:
                    if pdata["status"] == "NO_REPLY":
                        cstatus = "MISSED"
                    elif pdata["status"] == "ESCALATED":
                        cstatus = "ESCALATED"
                    else:
                        cstatus = "COMPLETED"
                else:
                    cstatus = "PENDING"

                db.add(CheckIn(
                    id=uuid.uuid4(),
                    patient_id=patient.id,
                    day_number=d,
                    status=cstatus,
                    sent_at=base_sent + timedelta(days=d),
                    replied_at=base_sent + timedelta(days=d, minutes=15) if cstatus == "COMPLETED" else None,
                    responses={"pain": "2", "fever": "no"} if cstatus == "COMPLETED" else {}
                ))

            db.add(TimelineEvent(
                id=uuid.uuid4(),
                patient_id=patient.id,
                event_type="ENROLLMENT",
                title="Protocol Started",
                description=f"Patient discharged from {pdata['bed']}. Enrollment completed.",
                day_number=0
            ))

            if pdata["status"] == "ESCALATED":
                db.add(Escalation(
                    id=uuid.uuid4(),
                    patient_id=patient.id,
                    level="CRITICAL",
                    status="OPEN",
                    trigger_type="keyword",
                    trigger_detail="severe pain + fever",
                    description=f"Day {pdata['day']} check-in escalated. Immediate review recommended.",
                    assigned_to=nurse.id
                ))
                db.add(TimelineEvent(
                    id=uuid.uuid4(),
                    patient_id=patient.id,
                    event_type="ESCALATION",
                    title=f"Day {pdata['day']} Escalation",
                    description="Pain: Severe. Fever: YES. Escalation alert sent.",
                    day_number=pdata["day"]
                ))

            if pdata["status"] == "NO_REPLY":
                db.add(Escalation(
                    id=uuid.uuid4(),
                    patient_id=patient.id,
                    level="WARNING",
                    status="OPEN",
                    trigger_type="no_reply",
                    trigger_detail=f"No response Day {pdata['day']}",
                    description="Patient did not reply. Family notified.",
                    assigned_to=nurse.id
                ))

        await db.commit()
        print("✅ Seed complete: 1 superadmin, 1 hospital, 2 users, 7 patients")

    except Exception as e:
        await db.rollback()
        print(f"❌ Seed error: {e}")
        raise
    finally:
        if close_session:
            await db.close()


if __name__ == "__main__":
    asyncio.run(seed())
