def register_plugins(app):
    """
    Registers all active game plugins to the main FastAPI application.
    To add a new game, just import its router here and include it.
    """
    from app.plugins.bingo.router import router as bingo_router
    from app.plugins.guess_master.router import router as guess_master_router
    
    app.include_router(bingo_router, prefix="/plugins/bingo", tags=["plugin-bingo"])
    app.include_router(guess_master_router, prefix="/plugins/guess_master", tags=["plugin-guess-master"])
