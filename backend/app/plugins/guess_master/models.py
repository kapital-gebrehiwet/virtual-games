from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Numeric, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class GuessMasterSession(Base):
    __tablename__ = "guess_master_sessions"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String, default="waiting")  # waiting, tie_breaker, finished
    drawn_numbers = Column(JSON, default=list) # max 20 numbers
    tie_breaker_players = Column(JSON, default=list) # User IDs allowed in tie-breaker
    prize_pool = Column(Numeric(10, 2), default=0.0)
    round_number = Column(Integer, default=1)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    entries = relationship("GuessMasterEntry", back_populates="session")

class GuessMasterEntry(Base):
    __tablename__ = "guess_master_entries"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("guess_master_sessions.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    round_number = Column(Integer, default=1)
    guesses = Column(JSON, default=list) # Exactly 5 numbers
    match_count = Column(Integer, default=0)
    is_winner = Column(Boolean, default=False)

    session = relationship("GuessMasterSession", back_populates="entries")
    user = relationship("User")
