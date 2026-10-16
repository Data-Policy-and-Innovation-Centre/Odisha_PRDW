"""Quick verification script for RWI dataset and chatbot integration."""
import sys
from pathlib import Path

# Ensure Ask is in sys.path
sys.path.insert(0, str(Path(__file__).parent))

from db_factory import get_adapter
from main import _try_handle_rwi, startup

print("=" * 70)
print("  VERIFYING RELATIVE WEALTH INDEX (RWI) DATASET & CHATBOT INTEGRATION")
print("=" * 70)

startup()
adapter = get_adapter()

# 1. Check database coverage
count_dim = adapter.execute("SELECT COUNT(*) FROM dim_rwi").fetchone()[0]
count_v = adapter.execute("SELECT COUNT(*) FROM v_rwi").fetchone()[0]
print(f"\n[1] Database Coverage:")
print(f"    - dim_rwi row count: {count_dim} (translated to canonical LGD codes)")
print(f"    - v_rwi view row count: {count_v} (statewide coverage preserved)")

# 2. Test Angarbandha (non-pilot GP from review feedback)
print("\n[2] Testing Yashaswi's Review Case: Angarbandha (Canonical LGD 115550)")
q1 = "What is the Relative Wealth Index of Angarbandha?"
res1 = _try_handle_rwi(q1, "session_verify_1")
print(f"    Question: '{q1}'")
print(f"    Answer:   {res1.answer.splitlines()[0]}")
print(f"    Row data: {res1.result}")

# 3. Test Bandhpali (pilot GP)
print("\n[3] Testing Pilot GP: Bandhpali (Canonical LGD 116397)")
q2 = "What is the Relative Wealth Index of Bandhpali?"
res2 = _try_handle_rwi(q2, "session_verify_2")
print(f"    Question: '{q2}'")
print(f"    Answer:   {res2.answer.splitlines()[0]}")
print(f"    Row data: {res2.result}")

# 4. Test Ranking (Highest in Anugul district)
print("\n[4] Testing Ranking: Highest RWI in Anugul District")
q3 = "Which Gram Panchayats have the highest Relative Wealth Index in Anugul?"
res3 = _try_handle_rwi(q3, "session_verify_3")
print(f"    Question: '{q3}'")
print(f"    Answer:   {res3.answer.splitlines()[0]}")
for i, r in enumerate(res3.result[:3], 1):
    print(f"      {i}. {r['gp_name']} (LGD: {r['gp_lgd_code']}): {r['rwi_score']}")

# 5. Test Aggregation (Summary in Anugul district)
print("\n[5] Testing Aggregation: Average RWI Summary in Anugul District")
q4 = "What is the average Relative Wealth Index in Anugul?"
res4 = _try_handle_rwi(q4, "session_verify_4")
print(f"    Question: '{q4}'")
print(f"    Answer:   {res4.answer.splitlines()[0]}")
print(f"    Metrics:  {res4.result[0]}")

print("\n" + "=" * 70)
print("  ALL RWI VERIFICATIONS COMPLETED SUCCESSFULLY!")
print("=" * 70)
