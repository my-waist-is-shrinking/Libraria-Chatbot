import sys
import types
import langchain_community.llms

# Compatibility shim: ragas 0.4.3 imports removed VertexAI classes from langchain_community 1.x
vertexai_stub = types.ModuleType("langchain_community.chat_models.vertexai")
vertexai_stub.ChatVertexAI = type("ChatVertexAI", (), {})
sys.modules["langchain_community.chat_models.vertexai"] = vertexai_stub
langchain_community.llms.VertexAI = type("VertexAI", (), {})

"""Evaluate Libraria's chatbot answers using RAGAS and local Ollama.

Run from the backend folder:
    python -m app.commands.evaluate_ragas
"""

import csv
from pathlib import Path

from datasets import Dataset
from langchain_ollama import ChatOllama, OllamaEmbeddings
from ragas import RunConfig, evaluate
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.llms import LangchainLLMWrapper
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)

from app.core.config import settings
from app.db.models import Book
from app.db.session import SessionLocal
from app.services import chat as chat_service
from app.services.book import book_to_text

GOLDEN_FILE = Path("evaluation/golden_dataset.csv")
RESULTS_FILE = Path("evaluation/ragas_results.csv")


def parse_ids(text: str) -> list[int]:
    """Turn '16;142;145' into [16, 142, 145]. Empty text -> []."""
    return [int(x) for x in text.split(";") if x.strip()]


def build_ground_truth(db, relevant_ids: list[int]) -> str:
    """Auto-generate the ground_truth reference from the answer-key books in the DB."""
    if not relevant_ids:
        return (
            "The CCS library catalog does not have any matching books on this topic."
        )

    books = db.query(Book).filter(Book.id.in_(relevant_ids)).all()
    book_descriptions = [book_to_text(b) for b in books]
    return "Relevant CCS library books:\n\n" + "\n\n".join(book_descriptions)


def main():
    db = SessionLocal()
    try:
        # 1. Read the golden dataset
        with GOLDEN_FILE.open(encoding="utf-8-sig") as f:
            questions = list(csv.DictReader(f))

        # Optional: slice questions[:5] first if you want a quick test run!
        print(f"Running Libraria chatbot on {len(questions)} questions...\n")

        data = []
        for q in questions:
            query = q["query"]
            relevant_ids = parse_ids(q["relevant_ids"])

            # 2. Run Libraria's actual RAG pipeline (retrieve + generate)
            reply, retrieved_books = chat_service.answer(db, message=query, history=[])

            # Format retrieved books into list[str] contexts for RAGAS
            contexts = [book_to_text(b) for b in retrieved_books]

            # Build ground truth string from the relevant_ids in golden_dataset.csv
            ground_truth = build_ground_truth(db, relevant_ids)

            print(f"[{q['id']:>2}] Answered: {query}")
            data.append({
                "question": query,
                "answer": reply,
                "contexts": contexts,
                "ground_truth": ground_truth,
            })

        # 3. Format into a RAGAS-compatible Dataset (same as Milvus docs)
        dataset = Dataset.from_dict({
            "question": [d["question"] for d in data],
            "answer": [d["answer"] for d in data],
            "contexts": [d["contexts"] for d in data],
            "ground_truth": [d["ground_truth"] for d in data],
        })

        # 4. Configure RAGAS to use your local Ollama models instead of OpenAI
        ollama_llm = LangchainLLMWrapper(
            ChatOllama(
                model=settings.chat_model,       # qwen2.5:7b from .env
                base_url=settings.ollama_url,    # http://localhost:11434
                temperature=0,
            )
        )
        ollama_embeddings = LangchainEmbeddingsWrapper(
            OllamaEmbeddings(
                model=settings.embed_model,      # nomic-embed-text from .env
                base_url=settings.ollama_url,
            )
        )

        # Keep max_workers=1 so local Ollama isn't overloaded with parallel requests
        run_config = RunConfig(max_workers=1, timeout=180, max_retries=2)

        print("\nEvaluating with RAGAS (using local Ollama as judge)...")
        result = evaluate(
            dataset=dataset,
            metrics=[
                faithfulness,       # Did it stick strictly to the retrieved books?
                answer_relevancy,   # Did it actually answer the student's question?
                context_precision,  # Were the retrieved books relevant?
                context_recall,     # Did it retrieve the ground-truth details needed?
            ],
            llm=ollama_llm,
            embeddings=ollama_embeddings,
            run_config=run_config,
        )

        # 5. Print summary and save per-question results to CSV
        print("\n========== RAGAS OVERALL SCORES ==========")
        print(result)

        df = result.to_pandas()
        df.to_csv(RESULTS_FILE, index=False, encoding="utf-8")
        print(f"\nDetailed per-question scores saved to {RESULTS_FILE}")

    finally:
        db.close()


if __name__ == "__main__":
    main()