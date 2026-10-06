from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, JSON, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


class Base(DeclarativeBase):
    pass


class VehicleCache(Base):
    __tablename__ = "vehicle_cache"
    plate: Mapped[str] = mapped_column(String(6), primary_key=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


def create_sessions(url: str) -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine(url, pool_pre_ping=True)
    return async_sessionmaker(engine, expire_on_commit=False)
