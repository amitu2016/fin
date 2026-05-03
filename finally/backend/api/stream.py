import asyncio
import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.get("/stream/prices")
async def stream_prices(request: Request):
    """SSE endpoint: pushes all ticker prices every ~500ms."""

    async def event_stream():
        provider = request.app.state.market_provider
        while not await request.is_disconnected():
            prices = await provider.get_all_prices()
            payload = json.dumps(
                [{"ticker": t, **v} for t, v in prices.items()]
            )
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
