from sqlalchemy import create_engine, URL
from sqlalchemy.orm import sessionmaker

from config import settings

_db_url = URL.create(
    drivername="postgresql",
    username=(settings.DATABASE_USER or "postgres").strip(),
    password=settings.DATABASE_PASSWORD
    if settings.DATABASE_PASSWORD is not None
    else "Postgresql123",
    host=(settings.DATABASE_HOST or "127.0.0.1").strip(),
    port=int((settings.DATABASE_PORT or "5432").strip()),
    database=(settings.DATABASE_NAME or "ai_q_db").strip(),
)

engine = create_engine(
    _db_url,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10},
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()