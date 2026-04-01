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
SERVER = "DEV"

# Emails permitted to register when SERVER == "DEV"
ALLOWED_EMAILS = {
    "armacwan@gmail.com",
    "angel.macwan@staticalabs.com",
    "angelmacwan@staticalabs.com",
    "saskia.oditt@staticalabs.com",
    "saskia.oditt@test.com",
}
