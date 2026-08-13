from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from src.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    channel = Column(String, default="web")
    created_at = Column(DateTime, default=datetime.utcnow)


class DiabetesProfile(Base):
    __tablename__ = "diabetes_profiles"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, nullable=True)
    session_id = Column(String, index=True)
    
    # Status diabetes
    diabetes_status = Column(String, default="unknown")  # diagnosed, suspected, unknown
    diabetes_type = Column(String, default="unknown")    # type1, type2, gestational, unknown
    
    # Gejala
    symptoms = Column(JSON, default=list)
    
    # Data klinis
    blood_sugar_info = Column(String, nullable=True)
    hba1c_info = Column(String, nullable=True)
    medications = Column(JSON, default=list)
    
    # Kondisi khusus
    wound_info = Column(String, nullable=True)
    has_doctor = Column(Boolean, nullable=True)
    is_pregnant = Column(Boolean, nullable=True)
    
    # Gaya hidup
    diet_concerns = Column(JSON, default=list)
    exercise_frequency = Column(String, nullable=True)
    
    # Metadata
    safety_status = Column(String, default="safe")  # safe, caution, emergency
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    sender = Column(String)  # user, assistant
    message = Column(Text)
    intent = Column(String, nullable=True)
    red_flags = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    patient_id = Column(Integer, nullable=True)
    
    ticket_type = Column(String)  # consultation, emergency, follow_up, wound_care
    priority = Column(String, default="normal")  # low, normal, high, urgent
    summary = Column(Text)
    status = Column(String, default="open")  # open, in_progress, resolved, closed
    assigned_to = Column(String, nullable=True)
    
    # WhatsApp handoff
    whatsapp_link = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()