# Deep Agents Quickstart

A minimal, model-agnostic research agent built with [Deep Agents](https://docs.langchain.com/oss/javascript/deepagents/quickstart) and LangChain open source skills.

## Features

- **Model Agnostic**: Works with Anthropic (`claude-sonnet-5`), OpenAI (`gpt-5.5` / `gpt-4o`), or Google Gemini (`gemini-2.5-flash`).
- **Provider-Native Web Search**: Uses server-side provider web search without requiring a separate search API key.
- **LangSmith Tracing**: Pre-configured with `LANGSMITH_ENDPOINT=https://api.smith.langchain.com`.

## Quickstart

1. Configure your API key in `.env`:
   ```env
   # Set your provider key:
   ANTHROPIC_API_KEY="your-anthropic-key"
   # or
   OPENAI_API_KEY="your-openai-key"
   # or
   GOOGLE_API_KEY="your-google-key"

   # LangSmith endpoint is preset to:
   LANGSMITH_ENDPOINT="https://api.smith.langchain.com"
   LANGSMITH_TRACING="true"
   ```

2. Run the research agent:
   ```bash
   pnpm start
   ```

3. Run with a custom research query:
   ```bash
   pnpm start "What are the latest features in LangChain and Deep Agents?"
   ```
