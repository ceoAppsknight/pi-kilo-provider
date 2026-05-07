# Pi Kilo Provider

This Pi extension registers the Kilo AI Gateway as a custom provider.

It uses Kilo's OpenAI-compatible API:

- Models: `GET https://api.kilo.ai/api/gateway/models`
- Chat completions: `POST https://api.kilo.ai/api/gateway/chat/completions`

## Installation

Install the package from npm:

```sh
pi install npm:@syedassadullahshah/pi-kilo-provider
```

Set your Kilo API key:

```sh
export KILO_API_KEY="your-kilo-api-key"
```

Then start Pi and select a model from the `kilo` provider, such as:

- `kilo-auto/frontier`
- `kilo-auto/balanced`
- `kilo-auto/free`
- `anthropic/claude-sonnet-4.6`
- `openai/gpt-5.4`

## Development

To test this repository locally without installing from npm:

```sh
pi -e ./index.ts --list-models
pi -e ./index.ts
```

## Notes

Reasoning is enabled for Kilo models that advertise `reasoning` or `reasoning_effort` in `supported_parameters`. Pi will show its Thinking level option for those models and sends Kilo/OpenRouter-style `reasoning: { effort }` payloads. Fallback auto models also expose the Thinking option.
