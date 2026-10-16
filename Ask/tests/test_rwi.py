"""Unit and integration tests for Relative Wealth Index (RWI) query templates,
view resolution, and canonical LGD code integration in Ask chatbot.
"""
import os
import unittest

from Ask import db_factory
from Ask.main import _try_handle_rwi, startup
from Ask.query_router.template_catalog import TEMPLATE_CATALOG, bind


class RWITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["DB_ENGINE"] = "duckdb_file"
        os.environ["DB_PATH"] = "data/panchayat_1.duckdb"
        startup()
        cls.adapter = db_factory.get_adapter()

    def test_v_rwi_contains_full_statewide_coverage(self):
        """v_rwi must not be truncated by a JOIN on gram_panchayat's pilot roster."""
        res = self.adapter.execute("SELECT COUNT(*) FROM v_rwi")
        count = res.fetchone()[0]
        self.assertGreaterEqual(
            count,
            6700,
            f"Expected full statewide coverage (6,700+ GPs) in v_rwi, got {count}",
        )

    def test_angarbandha_lgd_translation_and_score(self):
        """Angarbandha must resolve to canonical LGD code 115550 (not state code 14010028)."""
        res = self.adapter.execute(
            "SELECT gp_lgd_code, district_name, block_name, gp_name, rwi_score "
            "FROM v_rwi WHERE gp_lgd_code = '115550'"
        ).fetchall()
        self.assertEqual(len(res), 1)
        row = res[0]
        self.assertEqual(row[0], "115550")
        self.assertEqual(row[1], "Anugul")
        self.assertEqual(row[2], "Anugul")
        self.assertEqual(row[3], "Angarbandha")
        self.assertAlmostEqual(row[4], 0.2948, places=4)

    def test_rwi_001_lookup_binding(self):
        """RWI-001 template must successfully bind and query a canonical LGD code."""
        sql, params = bind("RWI-001", {"gp_name": "115550"})
        res = self.adapter.execute(sql, params).fetchall()
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0][0], "115550")
        self.assertEqual(res[0][1], "Angarbandha")
        self.assertAlmostEqual(res[0][4], 0.2948, places=4)

    def test_rwi_002_and_003_ranking(self):
        """RWI-002 (highest) and RWI-003 (lowest) ranking templates execute for non-pilot districts."""
        sql_high, p_high = bind("RWI-002", {"district_name": "Anugul", "top_n": 5})
        rows_high = self.adapter.execute(sql_high, p_high).fetchall()
        self.assertEqual(len(rows_high), 5)
        self.assertTrue(all(r[3] == "Anugul" for r in rows_high))
        # Descending order check
        scores_high = [r[4] for r in rows_high]
        self.assertEqual(scores_high, sorted(scores_high, reverse=True))

        sql_low, p_low = bind("RWI-003", {"district_name": "Anugul", "top_n": 5})
        rows_low = self.adapter.execute(sql_low, p_low).fetchall()
        self.assertEqual(len(rows_low), 5)
        # Ascending order check
        scores_low = [r[4] for r in rows_low]
        self.assertEqual(scores_low, sorted(scores_low))

    def test_rwi_004_summary_aggregation(self):
        """RWI-004 aggregates RWI metrics across all GPs in a district."""
        sql, params = bind("RWI-004", {"district_name": "Anugul"})
        res = self.adapter.execute(sql, params).fetchall()
        self.assertEqual(len(res), 1)
        geo, avg_s, min_s, max_s, total_gps = res[0]
        self.assertEqual(geo, "Anugul")
        self.assertGreater(total_gps, 20)
        self.assertLessEqual(min_s, avg_s)
        self.assertLessEqual(avg_s, max_s)

    def test_try_handle_rwi_chatbot_endpoint(self):
        """Chatbot _try_handle_rwi returns friendly text and rows for pilot and non-pilot GPs."""
        # Non-pilot GP
        resp = _try_handle_rwi("What is the Relative Wealth Index of Angarbandha?", "session_test")
        self.assertIsNotNone(resp)
        self.assertIn("Angarbandha Gram Panchayat", resp.answer)
        self.assertIn("0.2948", resp.answer)
        self.assertIsNotNone(resp.result)
        self.assertEqual(resp.result[0]["gp_lgd_code"], "115550")

        # Pilot GP
        resp_pilot = _try_handle_rwi("What is the Relative Wealth Index of Bandhpali?", "session_test")
        self.assertIsNotNone(resp_pilot)
        self.assertIn("Bandhpali Gram Panchayat", resp_pilot.answer)
        self.assertIn("-0.1989", resp_pilot.answer)


if __name__ == "__main__":
    unittest.main()
