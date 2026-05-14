"""
Quick diagnostic script to test pipeline timing with small sample (1k rows)
"""
from __future__ import annotations

import os
import time
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
import pandas as pd

from baseline_pipeline_common import (
    fetch_dimension_id_map,
    get_table_column_types,
    load_workbook_sheets,
    upsert_dimension_rows,
)
from rural_baseline_pipeline import (
    CHUNK_SIZE,
    DIMENSION_ID_COLUMN,
    DIMENSION_TABLE,
    KEY_COLUMNS,
    MAX_WORKERS,
    SHEET_CONFIGS,
    WORKBOOK_NAME,
    SOURCE_DIR,
    _process_table_task,
)

load_dotenv()
db_url = os.getenv("SUPABASE_DB_URL", "")

def run_diagnostic():
    """Run pipeline with 1k row limit for timing diagnosis"""
    print("=== ETL Pipeline Timing Diagnostic ===\n")
    print(f"Source: {SOURCE_DIR / WORKBOOK_NAME}")
    print(f"Row Limit: 1000 per sheet")
    print(f"Database URL configured: {bool(db_url)}")
    print()

    # Load workbook
    print("Loading workbook sheets...")
    t_load_start = time.time()
    all_sheets = load_workbook_sheets(SOURCE_DIR / WORKBOOK_NAME)
    print(f"  Workbook loaded in {time.time() - t_load_start:.2f}s\n")

    # Limit to 1k rows for quick diagnostic
    sample_sheets = {}
    for sheet_name, df in all_sheets.items():
        sample_sheets[sheet_name] = df.head(1000).copy()
        print(f"  {sheet_name}: {len(sample_sheets[sheet_name])} rows")

    # Connect and prepare dimension table
    print("\nConnecting to database...")
    engine = create_engine(
        db_url,
        pool_size=MAX_WORKERS + 2,
        max_overflow=2,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={"connect_timeout": 60, "options": "-c statement_timeout=300000"},
    )

    print("Upserting dimension table (dim_rural_gps)...")
    with engine.begin() as conn:
        # Get existing dimension IDs for later lookup
        dimension_id_by_key = fetch_dimension_id_map(
            conn,
            table_name=DIMENSION_TABLE,
            id_column=DIMENSION_ID_COLUMN,
            unique_columns=KEY_COLUMNS,
        )
    print(f"  Found {len(dimension_id_by_key)} existing GPS records\n")

    # Build table frame mappings
    from baseline_pipeline_common import build_target_frame
    table_frames = {}
    for config in SHEET_CONFIGS:
        sheet_name = config["sheet_name"]
        if sheet_name not in sample_sheets:
            continue

        for target in config["targets"]:
            table_name = target["table_name"]
            if table_name not in table_frames:
                table_frames[table_name] = []

            try:
                frame = build_target_frame(
                    sample_sheets[sheet_name],
                    target["mapping"],
                    KEY_COLUMNS,
                )
                if not frame.empty:
                    table_frames[table_name].append(frame)
            except Exception as e:
                print(f"  Error building frame for {sheet_name} → {table_name}: {e}")

    # Pre-fetch all column types once before threading
    print("Pre-fetching schema metadata for all tables...")
    all_table_columns: dict[str, dict[str, str]] = {}
    with engine.begin() as conn:
        for table_name in table_frames.keys():
            all_table_columns[table_name] = get_table_column_types(conn, table_name)

    print("Processing fact tables (with timing breakdown):")
    print("=" * 80)

    from concurrent.futures import ThreadPoolExecutor, as_completed

    total = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(
                _process_table_task,
                engine,  # Shared engine
                table_name,
                frames,
                dimension_id_by_key,
                all_table_columns[table_name],  # Pre-fetched columns
            ): table_name
            for table_name, frames in table_frames.items()
        }

        for future in as_completed(futures):
            result = future.result()
            if result["error"]:
                print(f"  {result['table_name']}: ERROR - {result['error']}")
            else:
                print(f"  {result['table_name']}: ✓ {result['upserted']} rows "
                      f"({result['missing_keys']} missing keys)")
                total += result["upserted"]

    print("=" * 80)
    print("\nDiagnostic complete. Check timing output above for bottlenecks.")
    print("\nTiming Legend:")
    print("  engine_create: Creating SQLAlchemy engine (should be <0.2s)")
    print("  combine: Merging sheets (should be <0.1s)")
    print("  conn_open: Opening database connection (should be <0.1s)")
    print("  get_col_types: Querying schema (should be <0.1s)")
    print("  upsert: Bulk inserting rows (should be <0.5s for 1k)")
    print("\nIf any step is slow, check ETL Pipeline Timing Diagnostic notes.")

if __name__ == "__main__":
    run_diagnostic()
