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
        from app.models.patient import Patient
        from app.models.hospital import Hospital
        from app.models.user import User
        from app.models.checkin import CheckIn
        from app.models.escalation import Escalation
        from app.models.timeline import TimelineEvent

        # FIX: Check for patients instead of admin — seed runs even if admin exists
        result = await db.execute(select(Patient))
        if result.scalars().first():
            print("✅ Seed data already exists, skipping")
            return

        # Create superadmin if not exists (idempotent)
        result = await db.execute(select(User).where(User.email == "admin@ojas.care"))
        admin = result.scalar_one_or_none()
        if not admin:
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
            await db.flush()
        else:
            superadmin = admin

        # Create hospital if not exists
        result = await db.execute(select(Hospital))
        hospital = result.scalars().first()
        if not hospital:
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

        # Create nurse if not exists
        result = await db.execute(select(User).where(User.email == "nurse@cityhospital.com"))
        nurse = result.scalar_one_or_none()
        if not nurse:
            nurse = User(
                id=uuid.uuid4(),
                email="nurse@cityhospital.com",
                hashed_password=safe_hash("nurse123"),
                full_name="Nurse Anita",
                role="COORDINATOR",
                hospital_id=hospital.id,
                is_active=True
            )
            db.add(nurse)
            await db.flush()

        # Create doctor if not exists
        result = await db.execute(select(User).where(User.email == "dr.shikhar@cityhospital.com"))
        doctor = result.scalar_one_or_none()
        if not doctor:
            doctor = User(
                id=uuid.uuid4(),
                email="dr.shikhar@cityhospital.com",
                hashed_password=safe_hash("doctor123"),
                full_name="Dr. Shikhar",
                role="DOCTOR",
                hospital_id=hospital.id,
                is_active=True
            )
            db.add(doctor)
            await db.flush()

        patients_data = [
            {"name": "Rajesh Sharma", "mobile": "+91-98765-43210", "family": "+91-98765-43211", "age": 62, "surgery": "Total Knee Replacement", "doctor": "Dr. Shikhar", "specialty": "Orthopedics", "discharge": date(2026, 5, 10), "status": "ESCALATED", "day": 6, "bed": "Ward-4B-12", "uhid": "UHID-2026-0042", "risk_score": 85, "risk_level": "HIGH", "readmission_risk": "HIGH"},
            {"name": "Priya Nair", "mobile": "+91-98765-43220", "family": "+91-98765-43221", "age": 45, "surgery": "Laparoscopic Cholecystectomy", "doctor": "Dr. Shikhar", "specialty": "General Surgery", "discharge": date(2026, 5, 6), "status": "ACTIVE", "day": 10, "bed": "Ward-3A-05", "uhid": "UHID-2026-0041", "risk_score": 25, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Sunita Devi", "mobile": "+91-98765-43230", "family": "+91-98765-43231", "age": 68, "surgery": "CABG", "doctor": "Dr. Shikhar", "specialty": "Cardiac Surgery", "discharge": date(2026, 5, 8), "status": "NO_REPLY", "day": 8, "bed": "ICU-12", "uhid": "UHID-2026-0038", "risk_score": 70, "risk_level": "HIGH", "readmission_risk": "HIGH"},
            {"name": "Amit Joshi", "mobile": "+91-98765-43240", "family": "+91-98765-43241", "age": 34, "surgery": "Appendectomy", "doctor": "Dr. Shikhar", "specialty": "General Surgery", "discharge": date(2026, 5, 3), "status": "ACTIVE", "day": 13, "bed": "Ward-2C-08", "uhid": "UHID-2026-0035", "risk_score": 15, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Fatima Begum", "mobile": "+91-98765-43250", "family": "+91-98765-43251", "age": 55, "surgery": "Total Hip Replacement", "doctor": "Dr. Shikhar", "specialty": "Orthopedics", "discharge": date(2026, 5, 1), "status": "COMPLETED", "day": 14, "bed": "Ward-4B-15", "uhid": "UHID-2026-0032", "risk_score": 10, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Vikram Patel", "mobile": "+91-98765-43260", "family": "+91-98765-43261", "age": 48, "surgery": "Hernia Repair", "doctor": "Dr. Shikhar", "specialty": "General Surgery", "discharge": date(2026, 5, 9), "status": "ESCALATED", "day": 7, "bed": "Ward-3A-10", "uhid": "UHID-2026-0036", "risk_score": 75, "risk_level": "HIGH", "readmission_risk": "MEDIUM"},
            {"name": "Ramesh Iyer", "mobile": "+91-98765-43270", "family": "+91-98765-43271", "age": 58, "surgery": "Spinal Surgery", "doctor": "Dr. Shikhar", "specialty": "Neurosurgery", "discharge": date(2026, 5, 11), "status": "NO_REPLY", "day": 5, "bed": "Ward-5D-03", "uhid": "UHID-2026-0033", "risk_score": 55, "risk_level": "MEDIUM", "readmission_risk": "MEDIUM"},
            {"name": "Kavita Singh", "mobile": "+91-98765-43280", "family": "+91-98765-43281", "age": 42, "surgery": "Hysterectomy", "doctor": "Dr. Shikhar", "specialty": "Gynecology", "discharge": date(2026, 5, 7), "status": "ACTIVE", "day": 9, "bed": "Ward-2A-14", "uhid": "UHID-2026-0043", "risk_score": 30, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Mohan Lal", "mobile": "+91-98765-43290", "family": "+91-98765-43291", "age": 71, "surgery": "Pacemaker Implant", "doctor": "Dr. Shikhar", "specialty": "Cardiology", "discharge": date(2026, 5, 4), "status": "ACTIVE", "day": 12, "bed": "ICU-05", "uhid": "UHID-2026-0044", "risk_score": 45, "risk_level": "MEDIUM", "readmission_risk": "MEDIUM"},
            {"name": "Geeta Kumari", "mobile": "+91-98765-43300", "family": "+91-98765-43301", "age": 38, "surgery": "Thyroidectomy", "doctor": "Dr. Shikhar", "specialty": "ENT Surgery", "discharge": date(2026, 5, 2), "status": "COMPLETED", "day": 14, "bed": "Ward-1B-07", "uhid": "UHID-2026-0045", "risk_score": 20, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Suresh Kumar", "mobile": "+91-98765-43310", "family": "+91-98765-43311", "age": 52, "surgery": "Angioplasty", "doctor": "Dr. Shikhar", "specialty": "Cardiology", "discharge": date(2026, 5, 12), "status": "ESCALATED", "day": 4, "bed": "ICU-08", "uhid": "UHID-2026-0046", "risk_score": 80, "risk_level": "HIGH", "readmission_risk": "HIGH"},
            {"name": "Anita Desai", "mobile": "+91-98765-43320", "family": "+91-98765-43321", "age": 29, "surgery": "C-Section", "doctor": "Dr. Shikhar", "specialty": "Obstetrics", "discharge": date(2026, 5, 5), "status": "ACTIVE", "day": 11, "bed": "Ward-6A-03", "uhid": "UHID-2026-0047", "risk_score": 35, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Rakesh Verma", "mobile": "+91-98765-43330", "family": "+91-98765-43331", "age": 65, "surgery": "Prostatectomy", "doctor": "Dr. Shikhar", "specialty": "Urology", "discharge": date(2026, 5, 13), "status": "NO_REPLY", "day": 3, "bed": "Ward-5C-11", "uhid": "UHID-2026-0048", "risk_score": 60, "risk_level": "MEDIUM", "readmission_risk": "MEDIUM"},
            {"name": "Meera Kapoor", "mobile": "+91-98765-43340", "family": "+91-98765-43341", "age": 47, "surgery": "Mastectomy", "doctor": "Dr. Shikhar", "specialty": "Surgical Oncology", "discharge": date(2026, 5, 14), "status": "ACTIVE", "day": 2, "bed": "Ward-4A-09", "uhid": "UHID-2026-0049", "risk_score": 50, "risk_level": "MEDIUM", "readmission_risk": "MEDIUM"},
            {"name": "Arun Mishra", "mobile": "+91-98765-43350", "family": "+91-98765-43351", "age": 33, "surgery": "ACL Reconstruction", "doctor": "Dr. Shikhar", "specialty": "Orthopedics", "discharge": date(2026, 5, 15), "status": "ACTIVE", "day": 1, "bed": "Ward-4B-06", "uhid": "UHID-2026-0050", "risk_score": 28, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Pooja Reddy", "mobile": "+91-98765-43360", "family": "+91-98765-43361", "age": 56, "surgery": "Gastric Bypass", "doctor": "Dr. Shikhar", "specialty": "Bariatric Surgery", "discharge": date(2026, 4, 28), "status": "COMPLETED", "day": 14, "bed": "Ward-3B-12", "uhid": "UHID-2026-0051", "risk_score": 40, "risk_level": "MEDIUM", "readmission_risk": "MEDIUM"},
            {"name": "Sanjay Gupta", "mobile": "+91-98765-43370", "family": "+91-98765-43371", "age": 44, "surgery": "Liver Biopsy", "doctor": "Dr. Shikhar", "specialty": "Gastroenterology", "discharge": date(2026, 4, 30), "status": "COMPLETED", "day": 14, "bed": "Ward-2D-04", "uhid": "UHID-2026-0052", "risk_score": 22, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Deepa Menon", "mobile": "+91-98765-43380", "family": "+91-98765-43381", "age": 61, "surgery": "Cataract Surgery", "doctor": "Dr. Shikhar", "specialty": "Ophthalmology", "discharge": date(2026, 4, 29), "status": "COMPLETED", "day": 14, "bed": "Day Care-02", "uhid": "UHID-2026-0053", "risk_score": 18, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Naveen Chopra", "mobile": "+91-98765-43390", "family": "+91-98765-43391", "age": 39, "surgery": "Tonsillectomy", "doctor": "Dr. Shikhar", "specialty": "ENT Surgery", "discharge": date(2026, 4, 27), "status": "COMPLETED", "day": 14, "bed": "Ward-1A-08", "uhid": "UHID-2026-0054", "risk_score": 12, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Rebecca Thomas", "mobile": "+91-98765-43400", "family": "+91-98765-43401", "age": 50, "surgery": "Kidney Stone Removal", "doctor": "Dr. Shikhar", "specialty": "Urology", "discharge": date(2026, 4, 26), "status": "COMPLETED", "day": 14, "bed": "Ward-5C-15", "uhid": "UHID-2026-0055", "risk_score": 25, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Ashok Pandey", "mobile": "+91-98765-43410", "family": "+91-98765-43411", "age": 73, "surgery": "Hip Fracture Repair", "doctor": "Dr. Shikhar", "specialty": "Orthopedics", "discharge": date(2026, 5, 16), "status": "ESCALATED", "day": 1, "bed": "Ward-4B-18", "uhid": "UHID-2026-0056", "risk_score": 88, "risk_level": "HIGH", "readmission_risk": "HIGH"},
            {"name": "Lakshmi Narayan", "mobile": "+91-98765-43420", "family": "+91-98765-43421", "age": 67, "surgery": "Stroke Rehabilitation", "doctor": "Dr. Shikhar", "specialty": "Neurology", "discharge": date(2026, 5, 17), "status": "NO_REPLY", "day": 1, "bed": "Rehab-03", "uhid": "UHID-2026-0057", "risk_score": 65, "risk_level": "MEDIUM", "readmission_risk": "HIGH"},
            {"name": "Karan Malhotra", "mobile": "+91-98765-43430", "family": "+91-98765-43431", "age": 26, "surgery": "Fracture Fixation", "doctor": "Dr. Shikhar", "specialty": "Orthopedics", "discharge": date(2026, 5, 18), "status": "ACTIVE", "day": 1, "bed": "Ward-4A-22", "uhid": "UHID-2026-0058", "risk_score": 32, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Shanti Devi", "mobile": "+91-98765-43440", "family": "+91-98765-43441", "age": 78, "surgery": "Colostomy", "doctor": "Dr. Shikhar", "specialty": "General Surgery", "discharge": date(2026, 5, 19), "status": "ESCALATED", "day": 1, "bed": "Ward-3A-19", "uhid": "UHID-2026-0059", "risk_score": 92, "risk_level": "HIGH", "readmission_risk": "HIGH"},
            {"name": "Manish Agarwal", "mobile": "+91-98765-43450", "family": "+91-98765-43451", "age": 41, "surgery": "Varicose Vein Surgery", "doctor": "Dr. Shikhar", "specialty": "Vascular Surgery", "discharge": date(2026, 5, 20), "status": "ACTIVE", "day": 1, "bed": "Day Care-05", "uhid": "UHID-2026-0060", "risk_score": 20, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Usha Rani", "mobile": "+91-98765-43460", "family": "+91-98765-43461", "age": 59, "surgery": "Breast Lumpectomy", "doctor": "Dr. Shikhar", "specialty": "Surgical Oncology", "discharge": date(2026, 5, 21), "status": "ACTIVE", "day": 1, "bed": "Ward-4A-11", "uhid": "UHID-2026-0061", "risk_score": 48, "risk_level": "MEDIUM", "readmission_risk": "MEDIUM"},
            {"name": "Prakash Jha", "mobile": "+91-98765-43470", "family": "+91-98765-43471", "age": 54, "surgery": "Disc Replacement", "doctor": "Dr. Shikhar", "specialty": "Neurosurgery", "discharge": date(2026, 5, 22), "status": "NO_REPLY", "day": 1, "bed": "Ward-5D-09", "uhid": "UHID-2026-0062", "risk_score": 58, "risk_level": "MEDIUM", "readmission_risk": "MEDIUM"},
            {"name": "Nisha Saxena", "mobile": "+91-98765-43480", "family": "+91-98765-43481", "age": 36, "surgery": "Ovarian Cyst Removal", "doctor": "Dr. Shikhar", "specialty": "Gynecology", "discharge": date(2026, 5, 23), "status": "ACTIVE", "day": 1, "bed": "Ward-2A-17", "uhid": "UHID-2026-0063", "risk_score": 27, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Harish Bhatt", "mobile": "+91-98765-43490", "family": "+91-98765-43491", "age": 69, "surgery": "Bypass Graft Surgery", "doctor": "Dr. Shikhar", "specialty": "Vascular Surgery", "discharge": date(2026, 5, 24), "status": "ESCALATED", "day": 1, "bed": "ICU-11", "uhid": "UHID-2026-0064", "risk_score": 82, "risk_level": "HIGH", "readmission_risk": "HIGH"},
            {"name": "Preeti Jain", "mobile": "+91-98765-43500", "family": "+91-98765-43501", "age": 31, "surgery": "Septoplasty", "doctor": "Dr. Shikhar", "specialty": "ENT Surgery", "discharge": date(2026, 5, 25), "status": "ACTIVE", "day": 1, "bed": "Ward-1B-12", "uhid": "UHID-2026-0065", "risk_score": 15, "risk_level": "LOW", "readmission_risk": "LOW"},
            {"name": "Yogesh Pillai", "mobile": "+91-98765-43510", "family": "+91-98765-43511", "age": 46, "surgery": "Pancreatic Cyst Drainage", "doctor": "Dr. Shikhar", "specialty": "Gastroenterology", "discharge": date(2026, 5, 26), "status": "NO_REPLY", "day": 1, "bed": "Ward-2D-08", "uhid": "UHID-2026-0066", "risk_score": 55, "risk_level": "MEDIUM", "readmission_risk": "MEDIUM"},
            {"name": "Alka Sinha", "mobile": "+91-98765-43520", "family": "+91-98765-43521", "age": 63, "surgery": "Shoulder Replacement", "doctor": "Dr. Shikhar", "specialty": "Orthopedics", "discharge": date(2026, 5, 27), "status": "ACTIVE", "day": 1, "bed": "Ward-4B-21", "uhid": "UHID-2026-0067", "risk_score": 42, "risk_level": "MEDIUM", "readmission_risk": "MEDIUM"},
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
        print(" Seed complete: 1 superadmin, 1 hospital, 2 users, 32 patients")

    except Exception as e:
        await db.rollback()
        print(f"❌ Seed error: {e}")
        raise
    finally:
        if close_session:
            await db.close()


if __name__ == "__main__":
    asyncio.run(seed())
