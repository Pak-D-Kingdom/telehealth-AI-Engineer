from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import func

from src.config import get_settings


Base = declarative_base()


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    sku = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    category = Column(String, nullable=False)
    price = Column(Integer, nullable=True)
    stock_status = Column(String, default="unknown")
    skin_types = Column(Text, default="[]")
    concerns = Column(Text, default="[]")
    active_ingredients = Column(Text, default="[]")
    contraindications = Column(Text, default="[]")
    usage_instruction = Column(Text, default="")
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    session_id = Column(String, index=True, nullable=False)
    sender = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    intent = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True)
    session_id = Column(String, index=True, nullable=False)
    customer_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    order_id = Column(String, nullable=True)
    ticket_type = Column(String, nullable=False)
    priority = Column(String, default="medium")
    summary = Column(Text, default="")
    status = Column(String, default="open")
    created_at = Column(DateTime, server_default=func.now())


def get_engine():
    return create_engine(get_settings().database_url, future=True)


def create_session_factory():
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, future=True)


def init_db() -> None:
    Base.metadata.create_all(bind=get_engine())

