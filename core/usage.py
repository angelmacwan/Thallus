"""Shared usage tracking dataclass — imported by both core/ modules and api/billing.py."""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class UsageSummary:
    """Accumulated token usage across all LLM calls in a single task."""
    input_tokens: int = 0
    output_tokens: int = 0
    grounded_prompts: int = 0

    def add(self, input_tokens: int = 0, output_tokens: int = 0, grounded_prompts: int = 0) -> None:
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens
        self.grounded_prompts += grounded_prompts

    def __iadd__(self, other: "UsageSummary") -> "UsageSummary":
        self.input_tokens += other.input_tokens
        self.output_tokens += other.output_tokens
        self.grounded_prompts += other.grounded_prompts
        return self
