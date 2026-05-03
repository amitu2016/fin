def build_system_prompt(portfolio: dict) -> str:
    """Build system prompt with embedded portfolio context."""
    cash = portfolio["cash_balance"]
    total = portfolio["total_value"]
    pnl = portfolio["total_pnl"]

    positions_text = ""
    for p in portfolio.get("positions", []):
        price = p["current_price"] or p["avg_cost"]
        positions_text += (
            f"  {p['ticker']}: {p['quantity']:.2f} shares @ ${price:.2f} "
            f"(avg cost ${p['avg_cost']:.2f}, PnL ${p['unrealized_pnl']:.2f} / {p['pnl_pct']:.1f}%)\n"
        )
    if not positions_text:
        positions_text = "  (none)\n"

    watchlist_text = ""
    for w in portfolio.get("watchlist", []):
        price_str = f"${w['price']:.2f}" if w.get("price") else "N/A"
        watchlist_text += f"  {w['ticker']}: {price_str}\n"
    if not watchlist_text:
        watchlist_text = "  (empty)\n"

    return f"""You are FinAlly, an AI trading assistant. Be concise and data-driven.

Portfolio snapshot:
  Cash: ${cash:.2f}
  Total value: ${total:.2f}
  Unrealized PnL: ${pnl:.2f}

Positions:
{positions_text}
Watchlist:
{watchlist_text}

When the user asks you to buy, sell, or manage their watchlist, include the appropriate action in your structured response. Only execute trades or watchlist changes when explicitly requested. Explain your reasoning briefly.

Respond ONLY with valid JSON matching this schema:
{{
  "message": "<your reply to the user>",
  "trades": [
    {{"ticker": "<TICKER>", "side": "<buy|sell>", "quantity": <number>}}
  ],
  "watchlist_changes": [
    {{"ticker": "<TICKER>", "action": "<add|remove>"}}
  ]
}}
Leave "trades" and "watchlist_changes" as empty arrays if no actions are needed."""
