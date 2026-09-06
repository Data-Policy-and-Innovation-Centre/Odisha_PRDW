"""A caveat may state a proportion. It may never state a row count.

Caveats are rendered into the answer the user reads, so a figure in one carries
the authority of a footnote. The catalogue was written against the 20-GP pilot
database and its caveats hardcoded that database's counts. When the full-state
artifact was deployed, users started being told things like:

    Denominator is the GPs present in gram_panchayat (20 loaded)   -- actually 6,794
    Only 17 of 12,704 activities are marked WORK COMPLETED         -- actually 21,454 of 4,073,745
    all 1,911 activities with expenditure ... have a linked voucher, so this
    query correctly returns no rows                                -- 88,804 do not

The last one is the worst kind: it tells the user a correct, non-empty result is
impossible, so a real finding reads as a bug.

The root cause is structural, not clerical. An absolute count is a property of
one artifact; the application serves whichever artifact is pinned. A PROPORTION
survives that ("roughly two rows in five", "about 18%") and carries the same
meaning, which is why the fix restated them rather than recomputing them.

Comma-grouped digits are the signature of a row count. Scheme codes (4249),
years (2020-2021) and thresholds (1000) have no comma, so this rule catches the
dangerous shape without touching the legitimate ones.
"""
import ast
import pathlib
import re
import unittest

CATALOG = pathlib.Path(__file__).resolve().parents[1] / "query_router" / "template_catalog.py"

# 1,234 / 12,704 / 4,073,745 -- a formatted count. Not 4249, not 2020-2021.
ROW_COUNT = re.compile(r"\b\d{1,3}(?:,\d{3})+\b")


def _caveats() -> list[str]:
    src = CATALOG.read_text(encoding="utf-8")
    out = []
    for m in re.finditer(r'"caveat":\s*(\'(?:[^\'\\]|\\.)*\'|"(?:[^"\\]|\\.)*")', src):
        try:
            out.append(ast.literal_eval(m.group(1)))
        except (ValueError, SyntaxError):
            continue
    assert out, "no caveats parsed -- this test's extractor is broken, not the catalogue"
    return out


class CaveatsCarryNoRowCounts(unittest.TestCase):
    def test_the_extractor_actually_finds_the_caveats(self) -> None:
        # Guards the guard: a regex that matches nothing would pass vacuously.
        self.assertGreater(len(_caveats()), 200)

    def test_no_caveat_states_an_absolute_row_count(self) -> None:
        offenders = [
            (c[:150], ROW_COUNT.findall(c)) for c in _caveats() if ROW_COUNT.search(c)
        ]
        self.assertEqual(
            [],
            offenders,
            "caveats must state proportions, not counts -- a count is true of one "
            "artifact and is shown to the user as fact:\n"
            + "\n".join(f"  {nums} in: {text}" for text, nums in offenders[:10]),
        )

    def test_no_caveat_promises_an_empty_result(self) -> None:
        """'this returns no rows' turns a real finding into an apparent bug."""
        phrases = ("returns no rows", "correctly returns no rows", "Verified clean")
        offenders = [c[:150] for c in _caveats() if any(p in c for p in phrases)]
        self.assertEqual([], offenders, "\n".join(f"  {o}" for o in offenders[:10]))


if __name__ == "__main__":
    unittest.main()
