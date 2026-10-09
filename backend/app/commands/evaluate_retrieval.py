"""Measure how well the book search (retrieval) works, using the golden dataset.

For each test question it checks: of the 5 books the search found,
how many are in the answer key?

Run from the backend folder:  python -m app.commands.evaluate_retrieval
"""

import csv
import time
from pathlib import Path

from app.db.session import SessionLocal
from app.repositories import book as book_repo
from app.services import llm

K = 5  # how many books the search returns (same as TOP_K in chat.py)
GOLDEN_FILE = Path("evaluation/golden_dataset.csv")         # the answer key
RESULTS_FILE = Path("evaluation/retrieval_results.csv")     # where the scores are saved


def parse_ids(text: str) -> set[int]:
    """Turn "16;142;145" into {16, 142, 145}. Empty text → empty set."""
    return {int(x) for x in text.split(";") if x.strip()}


def main():
    db = SessionLocal()
    results = []
    try:
        # Read the answer key (utf-8-sig handles files saved by Excel)
        with GOLDEN_FILE.open(encoding="utf-8-sig") as f:
            questions = list(csv.DictReader(f))
        print(f"Testing {len(questions)} questions (top {K} books each)...\n")

        for q in questions:
            relevant = parse_ids(q["relevant_ids"])  # correct books from the answer key

            # Run the same search the chatbot uses, and time it
            start = time.perf_counter()
            vector = llm.embed([f"search_query: {q['query']}"])[0]
            found_books = book_repo.search_similar(db, vector, limit=K)
            seconds = time.perf_counter() - start

            found = [b.id for b in found_books]      # what the search returned
            hits = len(set(found) & relevant)        # how many of those are correct

            if relevant:
                precision = hits / K                 # of the 5 shown, how many were correct
                recall = hits / len(relevant)        # of all correct books, how many were found
                hit = 1 if hits > 0 else 0           # found at least one correct book?
                print(f"[{q['id']:>2}] P@5={precision:.2f}  R@5={recall:.2f}  hit={hit}  {q['query']}")
            else:
                # "No answer" questions (e.g. cooking) can't be scored here;
                # they test the AI's reply instead (faithfulness)
                precision = recall = hit = None
                print(f"[{q['id']:>2}] (no correct books, skipped)  {q['query']}")

            results.append({
                "id": q["id"],
                "query": q["query"],
                "precision_at_5": precision,
                "recall_at_5": recall,
                "hit_at_5": hit,
                "found_ids": ";".join(map(str, found)),
                "missed_ids": ";".join(map(str, sorted(relevant - set(found)))),  # correct books it didn't find
                "search_seconds": round(seconds, 3),
            })

        # Averages over the questions that have correct books
        scored = [r for r in results if r["recall_at_5"] is not None]
        avg_p = sum(r["precision_at_5"] for r in scored) / len(scored)
        avg_r = sum(r["recall_at_5"] for r in scored) / len(scored)
        hit_rate = sum(r["hit_at_5"] for r in scored) / len(scored)
        avg_time = sum(r["search_seconds"] for r in results) / len(results)

        print("\n========== RETRIEVAL RESULTS ==========")
        print(f"Questions scored:     {len(scored)} (skipped {len(results) - len(scored)} no-answer questions)")
        print(f"Average Precision@5:  {avg_p:.2f}")
        print(f"Average Recall@5:     {avg_r:.2f}")
        print(f"Hit Rate@5:           {hit_rate:.0%}")
        print(f"Average search time:  {avg_time:.2f} s")

        # Save every question's scores so you can put them in your paper
        with RESULTS_FILE.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)
        print(f"\nDetails saved to {RESULTS_FILE}")
    finally:
        db.close()


if __name__ == "__main__":
    main()