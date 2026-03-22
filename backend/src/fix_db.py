from adthub.config import settings
from sqlalchemy import create_engine, text
try:
    engine = create_engine(settings.database_url)
    with engine.begin() as conn:
        conn.execute(text("UPDATE alembic_version SET version_num = '42073ca3c7ee'"))
        print("Fixed alembic_version")
except Exception as e:
    print(e)
