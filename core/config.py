import os

# Google GenAI model used for ingestion, ontology, and profiling
MODEL_NAME = 'gemini-2.5-flash-lite'

# camel-ai model type string used by the OASIS simulation runner.
# Must be a model type recognised by camel-ai (e.g. "gemini-1.5-flash",
# "gemini-1.5-pro", "gpt-4o-mini").
CAMEL_MODEL_TYPE = MODEL_NAME

# Root folder where all run outputs are written
OUTPUTS_BASE = "OUTPUTS"

# Server environment: set to "DEV" to restrict registration to ALLOWED_EMAILS only.
# Any other value allows anyone to register.
SERVER = os.getenv("SERVER", "DEV")

# Emails with full admin access to the /admin panel.
ADMIN_EMAILS = {
    "angelmacwan@staticalabs.com",
    "armacwan@gmail.com"
}

# Initial allowed emails seeded into the DB on first run.
# After the first run the DB is the source of truth — edit via /admin.
_INITIAL_ALLOWED_EMAILS: set[str] = {
    "angelmacwan@staticalabs.com",
    "armacwan@gmail.com",
}

# ── Billing & Credits ─────────────────────────────────────────────────────────

# Gemini API pricing (USD per 1M tokens) — Paid Tier
GEMINI_INPUT_PRICE_PER_1M_USD: float = 0.10
GEMINI_OUTPUT_PRICE_PER_1M_USD: float = 0.40

# Gemini Search Grounding (USD per 1,000 grounded prompts)
GEMINI_GROUNDING_PRICE_PER_1K_USD: float = 35.0

# Profit multiplier: charges users more than raw API cost (e.g. 3.0 = 3× markup)
PROFIT_MULTIPLIER: float = 3.0

# Credits granted to each user on signup (stored internally as USD float)
FREE_CREDITS_ON_SIGNUP_USD: float = 1.00

# Display conversion: 1 USD = this many user-facing credits shown in the UI
CREDITS_PER_USD: int = 1000

# OASIS / camel-ai token estimation (per agent per round).
# Exact values are unavailable since camel-ai calls Gemini internally
# without exposing response.usage_metadata.
OASIS_EST_INPUT_TOKENS_PER_AGENT_ROUND: int = 800
OASIS_EST_OUTPUT_TOKENS_PER_AGENT_ROUND: int = 300

# ── Promo Codes ───────────────────────────────────────────────────────────────
# Managed entirely via /admin — create, update and delete from the admin panel.

EMAIL_SENDER_ADDRESS = "noreply@staticalabs.com"
