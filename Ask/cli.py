"""Interactive terminal chatbot to test and ask questions manually."""
import sys
import json
from pathlib import Path

# Ensure Ask is in sys.path
sys.path.insert(0, str(Path(__file__).parent))

from main import _try_handle_rwi, startup, app
from db_factory import get_adapter
from pydantic import BaseModel

print("=" * 65)
print("  🤖 Odisha PR&DW Ask Chatbot - Interactive Terminal")
print("  Type your questions below. Type 'exit' or 'quit' to stop.")
print("=" * 65)

# Boot up the database and validator
startup()

print("\nReady! You can ask questions like:")
print("  • What is the Relative Wealth Index of Angarbandha?")
print("  • What is the Relative Wealth Index of Bandhpali?")
print("  • Which Gram Panchayats have the highest Relative Wealth Index in Anugul?")
print("  • What is the average Relative Wealth Index in Bargarh?")
print("-" * 65)

while True:
    try:
        user_msg = input("\nAsk chatbot > ").strip()
        if not user_msg:
            continue
        if user_msg.lower() in ("exit", "quit", "q"):
            print("Exiting. Goodbye!")
            break

        # 1. Deterministic RWI route
        rwi_res = _try_handle_rwi(user_msg, "cli-session")
        if rwi_res is not None:
            print("\n" + "─" * 40)
            print("💬 Response:")
            print(rwi_res.answer)
            if rwi_res.result:
                print(f"\n📋 Returned Data ({len(rwi_res.result)} rows):")
                for r in rwi_res.result[:5]:
                    print("  ", r)
                if len(rwi_res.result) > 5:
                    print(f"  ... and {len(rwi_res.result) - 5} more rows")
            print("─" * 40)
            continue

        # 2. General catalog router
        from main import QueryRequest, handle_query
        req = QueryRequest(message=user_msg, session_id="cli-session")
        resp = handle_query(req)
        print("\n" + "─" * 40)
        print("💬 Response:")
        print(resp.answer)
        if resp.result:
            print(f"\n📋 Returned Data ({len(resp.result)} rows):")
            for r in resp.result[:5]:
                print("  ", r)
            if len(resp.result) > 5:
                print(f"  ... and {len(resp.result) - 5} more rows")
        print("─" * 40)

    except (KeyboardInterrupt, EOFError):
        print("\nExiting. Goodbye!")
        break
    except Exception as e:
        print(f"\n⚠️ Error processing question: {e}")
