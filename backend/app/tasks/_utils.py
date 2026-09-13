"""Helpers compartidos entre tasks de Celery."""
import asyncio
from collections.abc import Coroutine
from typing import Any


def run_async(coro: Coroutine[Any, Any, None]) -> None:
    """Corre una corrutina en un event loop nuevo — necesario porque los workers de Celery
    (prefork, síncronos) no tienen un loop de asyncio corriendo entre invocaciones de tasks."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(coro)
    finally:
        loop.close()
