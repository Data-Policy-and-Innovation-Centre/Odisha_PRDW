"""A database that ships its own v_* views must be trusted, not overwritten.

The views used to be absent from the .duckdb, so `_seed_views` built them in the
writable in-memory catalog unconditionally. The upstream warehouse now
materialises them into the artifact, and that unconditional CREATE became two
separate problems.

The cheap one is waste: `search_path` puts `memory.main` first, so an in-memory
view SHADOWS the shipped one and the precomputation is thrown away. `v_activity`
is referenced about 324 times by the query catalogue, and `v_asset` and
`v_progress` each join it again.

The expensive one took production down. This repository's `create_views.sql` is
pinned to an older warehouse schema, and against an artifact built by the current
pipeline it does not merely lose the precomputation -- it fails to bind:

    BinderException: Table "aa" does not have a column named "main_asset_category"

because those four `main_asset_*` fields now live on `planned_activity` rather
than `activity_asset`. The container exited 3, the ECS circuit breaker tripped,
and the service rolled back. The deployment machinery behaved correctly; this
code did not.

So the contract is: if the attached database provides every view, do not execute
the DDL at all. These tests pin both directions, because a fix that always skips
would break the 20-GP sample database, which genuinely has no views.
"""
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import duckdb

from Ask.db_adapters import DuckDBFileAdapter
from Ask.db_factory import VIEWS, _seed_views

SAMPLE = Path(__file__).resolve().parents[1] / "data" / "panchayat_1.duckdb"


def _db_that_ships_views(directory: Path) -> Path:
    """A minimal artifact carrying all of VIEWS as real relations."""
    path = directory / "shipped.duckdb"
    conn = duckdb.connect(str(path))
    for view in VIEWS:
        conn.execute(f'CREATE TABLE "{view}" (activity_code VARCHAR)')
        conn.execute(f"INSERT INTO \"{view}\" VALUES ('a1')")
    conn.close()
    return path


class ShippedViewsArePreferred(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def test_the_ddl_is_not_executed_when_the_artifact_has_the_views(self) -> None:
        adapter = DuckDBFileAdapter(_db_that_ships_views(self.tmp))
        try:
            names = _seed_views(adapter)
            self.assertEqual(sorted(VIEWS), names)
            # The load-bearing assertion. Anything in the memory catalog would
            # shadow the shipped relation and discard the precomputation.
            self.assertEqual([], adapter.memory_views())
        finally:
            adapter.close()

    def test_a_stale_ddl_cannot_break_startup_when_the_views_are_shipped(self) -> None:
        """The production failure, pinned.

        The DDL here is unrunnable. Before the fix `_seed_views` executed it
        regardless and the container exited; after it, the file is never read.
        """
        broken = self.tmp / "broken.sql"
        broken.write_text('CREATE VIEW v_activity AS SELECT no_such_column FROM no_such_table;')

        adapter = DuckDBFileAdapter(_db_that_ships_views(self.tmp))
        try:
            with mock.patch("Ask.db_factory.VIEWS_DDL_PATH", broken):
                names = _seed_views(adapter)
            self.assertEqual(sorted(VIEWS), names)
        finally:
            adapter.close()

    def test_the_views_are_proved_to_select_not_merely_to_exist(self) -> None:
        """A shipped name that cannot be read must still fail loudly."""
        path = self.tmp / "corrupt.duckdb"
        conn = duckdb.connect(str(path))
        for view in VIEWS[:-1]:
            conn.execute(f'CREATE TABLE "{view}" (x INTEGER)')
        # Present in the catalog, but its body references a missing table.
        conn.execute('CREATE TABLE _gone (x INTEGER)')
        conn.execute(f'CREATE VIEW "{VIEWS[-1]}" AS SELECT x FROM _gone')
        conn.execute('DROP TABLE _gone')
        conn.close()

        adapter = DuckDBFileAdapter(path)
        try:
            with self.assertRaises(Exception):
                _seed_views(adapter)
        finally:
            adapter.close()


class TheDdlPathStillWorks(unittest.TestCase):
    """The 20-GP sample ships no views, and must keep getting them."""

    @unittest.skipUnless(SAMPLE.exists(), "sample database not present")
    def test_views_are_created_when_the_artifact_lacks_them(self) -> None:
        adapter = DuckDBFileAdapter(SAMPLE)
        try:
            shipped = set(adapter.data_relations())
            self.assertFalse(
                [v for v in VIEWS if v in shipped],
                "the sample now ships views; this test's premise is stale",
            )
            names = _seed_views(adapter)
            self.assertEqual(sorted(VIEWS), names)
            self.assertEqual(sorted(VIEWS), sorted(adapter.memory_views()))
        finally:
            adapter.close()


if __name__ == "__main__":
    unittest.main()
