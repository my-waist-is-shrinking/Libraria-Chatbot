"""Standalone benchmark script to measure the exact latency of each step in the RAG pipeline:
1. Ollama local embedding latency
2. Supabase Cloud vector search latency
3. LLM generation latency (Gemini 3.5 Flash)

Run from backend:
    python -m app.commands.benchmark_chat
"""

import time
from app.db.session import SessionLocal
from app.repositories import book as book_repo
from app.services import llm
from app.services.book import book_to_text
from app.services.prompts import SYSTEM_PROMPT, build_user_prompt


def run_benchmark(test_query: str = "Recommend a book for Python programming"):
    print("\n=======================================================")
    print(f">> BENCHMARKING RAG PIPELINE FOR: \"{test_query}\"")
    print("=======================================================\n")

    db = SessionLocal()
    total_start = time.time()

    try:
        # Step 1: Embedding Latency (Ollama)
        print("[1/3] Testing Embedding (Ollama: nomic-embed-text)...")
        t0 = time.time()
        query_vector = llm.embed([f"search_query: {test_query}"])[0]
        embed_time = time.time() - t0
        print(f"      Done in: {embed_time:.2f} seconds (Vector dimension: {len(query_vector)})\n")

        # Step 2: Supabase Vector Search Latency
        print("[2/3] Testing Supabase Cloud Vector Search...")
        t0 = time.time()
        books = book_repo.search_similar(db, query_vector, limit=3)
        db_time = time.time() - t0
        print(f"      Done in: {db_time:.2f} seconds (Found {len(books)} books)")
        for b in books:
            print(f"      - {b.title} (by {b.author or 'Unknown'})")
        print()

        # Step 3: LLM Generation Latency (calls llm.chat)
        print("[3/3] Testing LLM Response Generation (llm.chat with Gemini 3.5 Flash)...")
        book_list = "\n\n---\n\n".join(book_to_text(b) for b in books)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(book_list, test_query)},
        ]

        t0 = time.time()
        reply = llm.chat(messages)
        llm_time = time.time() - t0
        print(f"      Done in: {llm_time:.2f} seconds\n")

        total_time = time.time() - total_start

        # Summary
        print("================== LATENCY BREAKDOWN ==================")
        print(f" 1. Ollama Embedding:     {embed_time:6.2f}s  ({(embed_time/total_time)*100:4.1f}%)")
        print(f" 2. Supabase DB Search:   {db_time:6.2f}s  ({(db_time/total_time)*100:4.1f}%)")
        print(f" 3. LLM Generation:       {llm_time:6.2f}s  ({(llm_time/total_time)*100:4.1f}%)")
        print("-------------------------------------------------------")
        print(f" >> TOTAL PIPELINE TIME:   {total_time:6.2f}s")
        print("=======================================================\n")
        print("--- MODEL REPLY PREVIEW ---")
        print(reply[:300] + ("..." if len(reply) > 300 else ""))
        print("---------------------------\n")

    finally:
        db.close()


if __name__ == "__main__":
    run_benchmark()
