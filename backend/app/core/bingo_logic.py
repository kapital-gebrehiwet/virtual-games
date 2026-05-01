import random

def generate_bingo_card() -> dict:
    """Generates a standard 5x5 Bingo card."""
    card = {
        "B": random.sample(range(1, 16), 5),
        "I": random.sample(range(16, 31), 5),
        "N": random.sample(range(31, 46), 5),
        "G": random.sample(range(46, 61), 5),
        "O": random.sample(range(61, 76), 5),
    }
    # Set the center space (N3) to "FREE"
    card["N"][2] = "FREE"
    return card

def check_winner(card: dict, drawn_numbers: set) -> bool:
    """Checks if a bingo card has a winning pattern based on drawn numbers."""
    
    # 1. Convert drawn_numbers to a set for O(1) lookups
    # "FREE" space is implicitly always drawn
    drawn = set(drawn_numbers)
    drawn.add("FREE")

    # The columns are defined directly in the card dictionary
    cols = ["B", "I", "N", "G", "O"]

    # 2. Check vertical columns
    for col in cols:
        if all(num in drawn for num in card[col]):
            return True

    # 3. Check horizontal rows
    for row_idx in range(5):
        if all(card[col][row_idx] in drawn for col in cols):
            return True

    # 4. Check diagonals
    # Top-left to bottom-right
    if all(card[cols[i]][i] in drawn for i in range(5)):
        return True
        
    # Top-right to bottom-left
    if all(card[cols[i]][4-i] in drawn for i in range(5)):
        return True

    return False
