# Cognee spike

Cognee fits kowalski as an optional recall layer: it takes a custom graph model, runs on local models, and lets each item be tagged so answers can be traced. A live run on 2026-10-10 with local llama3.1:8b failed graph summarisation, but a second run with Cognee's LLM-free GLiNER extractor and local embeddings worked: graph built in 79 s, and every search result carries its kowalski id. Verdict: go for T9 on the GLiNER path; no LLM sees the text.

- **As of** 2026-10-10
- **Version** cognee 1.6.3, installed with uv into a throwaway venv in the session scratchpad (not in this repo)
- **Marks** [V] ran it, [S] read it in the installed source, [U] unverified

## 01 The three checks

| Check | Answer | Mark | Where |
|---|---|---|---|
| Custom graph model | Yes. `cognify()` takes `graph_model: BaseModel = KnowledgeGraph`, plus `ontology_file_path` and `custom_prompt`. Our model (Principle, User, Bet, Evidence, Resource, Outcome) would be a pydantic model passed here | [S] | `api/v1/cognify/cognify.py` |
| Default provider | OpenAI for both: `llm_provider = "openai"`, embeddings `openai/text-embedding-3-large`. So by default ingested text goes to OpenAI. Ollama is supported for the LLM (`is_local_llm` treats Ollama and llama.cpp as local) and for embeddings (`OllamaEmbeddingEngine`) | [S] | `infrastructure/llm/config.py`, `infrastructure/databases/vector/embeddings/config.py` |
| Traceable answers | Partly. A `SearchResult` carries `dataset_id` and `dataset_name`, not the item id. `add()` takes `node_set: list[str]`, which tags data points and can filter search. Plan: one node_set per kowalski id (`b-007`, `r-003`) and the id written into the ingested text, so answers can cite it | [S] for the API, [U] that answers actually cite it | `modules/search/types/SearchResult.py`, `api/v1/add/add.py` |

Also found [S]: 20 search types (CHUNKS, GRAPH_COMPLETION, TEMPORAL, CYPHER and others); MCP server code exists in the cognee project (`tests/deployment/test_mcp_http_direct.py`), shipped separately as cognee-mcp, not checked here; the package ships its own agent skill (`cognee/skill.md`).

## 02 Live run, 2026-10-10

Local only: Ollama `llama3.1:8b` for the LLM, `nomic-embed-text` for embeddings, storage in the scratchpad, `TELEMETRY_DISABLED=1`. Input: the PostHog article (r-1) and two decisions (r-2, r-3), each tagged with `node_set=[id]` and prefixed with its id.

| Step | Result | Mark |
|---|---|---|
| `add` with node_set | Worked: 3 items in the dataset | [V] |
| LLM endpoint | `LLM_ENDPOINT=http://localhost:11434` (no `/v1`; with `/v1` LiteLLM gets a 404 and cognify fails its 30 s connection test) | [V] |
| Custom graph model | A plain pydantic nodes/edges model fails (`DocumentChunk.contains` expects Entity). It must subclass `cognee.infrastructure.engine.DataPoint`, as in cognee's own `skill.md`; with that, extraction ran | [V] |
| `extract_graph_and_summarize` | Failed: the 8B model echoes the JSON schema (`{'description': ..., 'type': 'string'}`) instead of a summary string; 3 retries, then `CognifyFailedError` | [V] |
| Search | Nothing to search: CHUNKS returns `[]`, GRAPH_COMPLETION says the graph is empty | [V] |
| Telemetry | Cognee sends telemetry unless `TELEMETRY_DISABLED` is set (`shared/utils.py`) | [S] |

So traceable answers were not reached [U].

## 03 Verdict

**First pass (llama3.1:8b): Cognee works, but not with an 8B local model.** Nothing needs a fork. Three ways forward, cheapest first:

1. **LLM-free extraction** (`extractor="gliner_demo"`, listed in cognee's `skill.md`) plus Ollama embeddings: no LLM sees the text, which also settles the client-data question [U, not tried].
2. **A bigger local model** with reliable structured output (for example a 14B-class model, about 9 GB) [U].
3. **A cleared cloud provider** (Anthropic or Vertex through LiteLLM) for resources and bets only; quotes from `.product/local/` stay out until the flag says the provider is cleared [U].

Rules for T9, whichever path: set the provider explicitly in `cognee.json` (the default sends text to OpenAI), set `TELEMETRY_DISABLED`, use DataPoint models, and keep `provider_cleared_for_client_data` false unless the provider is local or cleared. Until then the files carry recall.

## 04 Second live run: LLM-free extraction, 2026-10-10

`cognify(extractor="gliner_demo")`, embeddings on Ollama `nomic-embed-text`, no LLM in the pipeline, `TELEMETRY_DISABLED=1`. Same three documents, tagged `node_set=[id]`. Installing `cognee[gliner]` (torch CPU build) brought the scratch venv to 1.7G.

| Step | Result | Mark |
|---|---|---|
| cognify | Worked, 79 s for about 20 KB of text | [V] |
| CHUNKS "Why was open source deferred?" | Top hit is the open-source decision (r-2) | [V] |
| CHUNKS "How should we decide what to build next?" | Top 3 hits are the PostHog article (r-1) | [V] |
| CHUNKS "Which document says to test with minimal effort?" | Top hit is the PostHog article (r-1) | [V] |
| SUMMARIES | Returns extracted facts ("<project> uses open source", "<team> collaborates_with ..."), each with its set | [V] |
| Traceability | Every result has `belongs_to_set: ["r-<n>"]`, our id, on every chunk, not only the first | [V] |
| Where text goes | Extractor and embeddings run locally; the GLiNER weights and the tokenizer are downloaded from Hugging Face once (no document text sent) | [S] |

**Verdict: go for T9 on this path.** Recall is search over chunks and extracted facts, cited by kowalski id; no LLM reads client text, so `provider_cleared_for_client_data` matters only if a later step adds an LLM. GRAPH_COMPLETION (an LLM answer over the graph) is not part of this path. T9 should use `extractor="gliner_demo"`, `node_set=[id]` per item, CHUNKS and SUMMARIES search, and `TELEMETRY_DISABLED=1`.
