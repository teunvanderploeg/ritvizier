import sqlalchemy as sa

from alembic import op

revision = "001_vehicle_cache"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vehicle_cache",
        sa.Column("plate", sa.String(6), primary_key=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_vehicle_cache_expires_at", "vehicle_cache", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_vehicle_cache_expires_at", "vehicle_cache")
    op.drop_table("vehicle_cache")
