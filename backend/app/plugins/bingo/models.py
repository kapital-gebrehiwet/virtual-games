from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Enum, JSON
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum

class BingoSessionStatus(str, enum.Enum):
    waiting = "waiting" # Waiting for players to join
    active = "active"   # Numbers are being drawn
    finished = "finished" # BINGO called

class BingoSession(Base):
    __tablename__ = "bingo_sessions"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(Enum(BingoSessionStatus), default=BingoSessionStatus.waiting)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    
    # Store the sequence of drawn numbers e.g. [12, 45, 6, 72...]
    drawn_numbers = Column(JSON, default=list)

    cards = relationship("BingoCard", back_populates="session")


class BingoCard(Base):
    __tablename__ = "bingo_cards"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("bingo_sessions.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    # Grid of numbers: {"B": [1,4,12,15,9], "I": [...], ...}
    grid = Column(JSON, nullable=False)
    
    # Marked spaces: list of drawn numbers that exist on this card
    marked_numbers = Column(JSON, default=list)
    
    is_winner = Column(Integer, default=0) # 0 for False, 1 for True
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("BingoSession", back_populates="cards")
    user = relationship("User")
