import os
from abc import ABC, abstractmethod

from groq import APIError, AsyncGroq


class LLMProvider(ABC):
    @abstractmethod
    async def generate_response(self, prompt: str) -> str:
        """Generate text from a prompt using the configured language model."""
        raise NotImplementedError


class GroqProvider(LLMProvider):
    def __init__(self) -> None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY must be set to use GroqProvider")

        self._client = AsyncGroq(api_key=api_key)

    async def generate_response(self, prompt: str) -> str:
        if not prompt.strip():
            raise ValueError("prompt must not be empty")

        try:
            response = await self._client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[{"role": "user", "content": prompt}],
            )
        except APIError as error:
            raise RuntimeError("Groq failed to generate a response") from error

        if not response.choices:
            raise RuntimeError("Groq returned no response choices")

        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("Groq returned an empty response")

        return content