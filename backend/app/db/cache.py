from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class VehicleCache(Base):
    __tablename__ = "vehicle_cache"
    plate: Mapped[str] = mapped_column(String(6), primary_key=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


def create_sessions(url: str) -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine(
        url, pool_pre_ping=True, pool_timeout=3, connect_args={"timeout": 2}
    )
    return async_sessionmaker(engine, expire_on_commit=False)
