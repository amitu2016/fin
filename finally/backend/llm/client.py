import json
import os

import litellm

MODEL = "openrouter/openai/gpt-oss-120b"

_RESPONSE_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "chat_response",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "message": {"type": "string"},
                "trades": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "ticker": {"type": "string"},
                            "side": {"type": "string", "enum": ["buy", "sell"]},
                            "quantity": {"type": "number"},
                        },
                        "required": ["ticker", "side", "quantity"],
                        "additionalProperties": False,
                    },
                },
                "watchlist_changes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "ticker": {"type": "string"},
                            "action": {"type": "string", "enum": ["add", "remove"]},
                        },
                        "required": ["ticker", "action"],
                        "additionalProperties": False,
                    },
                },
            },
            "required": ["message", "trades", "watchlist_changes"],
            "additionalProperties": False,
        },
    },
}

_MOCK_RESPONSE = {
    "message": "Here is your portfolio summary. No trades requested.",
    "trades": [],
    "watchlist_changes": [],
}


async def call_llm(messages: list[dict]) -> dict:
    """Call LiteLLM with structured output. Returns parsed dict."""
    if os.environ.get("LLM_MOCK", "").lower() == "true":
        return _MOCK_RESPONSE

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set")

    response = await litellm.acompletion(
        model=MODEL,
        messages=messages,
        response_format=_RESPONSE_SCHEMA,
        api_key=api_key,
    )
    content = response.choices[0].message.content
    return json.loads(content)
