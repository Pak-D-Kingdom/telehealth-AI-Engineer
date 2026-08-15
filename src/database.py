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
    
    diabetes_status = Column(String, default="unknown")  
    diabetes_type = Column(String, default="unknown")    
    
    symptoms = Column(JSON, default=list)
    
    blood_sugar_info = Column(String, nullable=True)
    hba1c_info = Column(String, nullable=True)
    medications = Column(JSON, default=list)
    
    wound_info = Column(String, nullable=True)
    has_doctor = Column(Boolean, nullable=True)
    is_pregnant = Column(Boolean, nullable=True)
    
    diet_concerns = Column(JSON, default=list)
    exercise_frequency = Column(String, nullable=True)
    
    safety_status = Column(String, default="safe")  
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    sender = Column(String)  
    message = Column(Text)
    intent = Column(String, nullable=True)
    red_flags = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    patient_id = Column(Integer, nullable=True)
    
    ticket_type = Column(String)  
    priority = Column(String, default="normal")  
    summary = Column(Text)
    status = Column(String, default="open")  
    assigned_to = Column(String, nullable=True)
    
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