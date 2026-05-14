from __future__ import annotations

import warnings
from pathlib import Path
from typing import Iterable

import pandas as pd
from sqlalchemy import text

# Suppress FutureWarning from deprecated pandas behavior
warnings.filterwarnings("ignore", category=FutureWarning, module="pandas")

NUMERIC_SQL_TYPES = {
    "smallint",
    "integer",
    "bigint",
    "decimal",
    "numeric",
    "real",
    "double precision",
}


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Strip whitespace from column names
    df.columns = df.columns.str.strip()
    # Remove columns that are completely unnamed or empty
    df = df.loc[:, ~df.columns.astype(str).str.startswith("Unnamed")]
    # For object columns, strip whitespace and convert empty strings to NaN
    str_cols = df.select_dtypes(include="object").columns
    for col in str_cols:
        df[col] = df[col].astype(str).str.strip().replace({"nan": pd.NA, "": pd.NA})
    # Convert NaN-like strings to None
    df = df.replace({"NaN": None, "nan": None, "NAN": None, "NULL": None})
    # Final cleanup: any remaining NaN/NA becomes None
    df = df.where(pd.notna(df), None)
    return df


def load_sheet_dataframe(workbook_path: Path, sheet_name: str) -> pd.DataFrame:
    raw_df = pd.read_excel(workbook_path, sheet_name=sheet_name, header=0)
    return clean_dataframe(raw_df)


def load_workbook_sheets(workbook_path: Path) -> dict[str, pd.DataFrame]:
    """Read all sheets from workbook in one pass using fastest available engine.
    
    Priority: calamine (Rust-based, 5-10x faster) → openpyxl (fallback)
    """
    base_kwargs = {
        "sheet_name": None,
        "dtype": str,
        "na_values": ["", "NA", "N/A", "null", "NULL", "-", "nan", "NaN"],
        "keep_default_na": True,
    }

    # Try calamine first (Rust-based, extremely fast for large xlsx)
    try:
        raw_sheets = pd.read_excel(
            workbook_path,
            **base_kwargs,
            engine="calamine",
        )
    except Exception:
        # Fallback to openpyxl if calamine not available
        try:
            raw_sheets = pd.read_excel(
                workbook_path,
                **base_kwargs,
                engine="openpyxl",
                engine_kwargs={"read_only": True, "data_only": True},
            )
        except TypeError:
            # Final fallback: basic openpyxl without engine_kwargs
            raw_sheets = pd.read_excel(
                workbook_path,
                **base_kwargs,
                engine="openpyxl",
            )

    return {sheet_name: clean_dataframe(df) for sheet_name, df in raw_sheets.items()}


def normalize_key(value):
    if pd.isna(value):
        return None
    text_value = str(value).strip()
    return text_value if text_value else None


def build_target_frame(
    df: pd.DataFrame,
    mapping: dict[str, str],
    key_columns: list[str],
) -> pd.DataFrame:
    renamed = df.rename(columns=mapping)
    renamed = renamed.T.groupby(level=0).first().T

    missing_keys = [column for column in key_columns if column not in renamed.columns]
    if missing_keys:
        raise ValueError(f"Missing required location columns after mapping: {sorted(missing_keys)}")

    keep_columns = list(dict.fromkeys([*key_columns, *mapping.values()]))
    keep_columns = [column for column in keep_columns if column in renamed.columns]
    prepared = renamed[keep_columns].copy()

    for column in key_columns:
        prepared[column] = prepared[column].apply(normalize_key)

    prepared = prepared.where(pd.notna(prepared), None)
    prepared = prepared.dropna(subset=key_columns)
    prepared = prepared.drop_duplicates(subset=key_columns, keep="last")
    return prepared


def combine_frames(frames: Iterable[pd.DataFrame], key_columns: list[str]) -> pd.DataFrame:
    valid_frames = [frame for frame in frames if frame is not None and not frame.empty]
    if not valid_frames:
        return pd.DataFrame(columns=key_columns)

    combined = pd.concat(valid_frames, ignore_index=True, sort=False)
    combined = combined.where(pd.notna(combined), None)
    combined = combined.drop_duplicates(subset=key_columns, keep="last")
    combined = combined.groupby(key_columns, dropna=False, as_index=False).first()
    combined = combined.where(pd.notna(combined), None)
    return combined


def get_table_column_types(conn, table_name: str) -> dict[str, str]:
    rows = conn.execute(
        text(
            """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = :table_name
            """
        ),
        {"table_name": table_name},
    ).fetchall()
    return {row[0]: row[1] for row in rows}


def coerce_numeric_columns(df: pd.DataFrame, numeric_columns: list[str]) -> pd.DataFrame:
    """Coerce specified columns to numeric using vectorized operation."""
    if not numeric_columns:
        return df
    coerced = df.copy()
    existing = [c for c in numeric_columns if c in coerced.columns]
    if existing:
        coerced[existing] = coerced[existing].apply(pd.to_numeric, errors="coerce")
    return coerced


def upsert_dimension_row(
    conn,
    table_name: str,
    id_column: str,
    unique_columns: list[str],
    row: dict,
) -> int:
    params = {column: row[column] for column in unique_columns}
    placeholders = ", ".join(f":{column}" for column in unique_columns)
    update_clause = ", ".join(f"{column} = EXCLUDED.{column}" for column in unique_columns)

    sql = text(
        f"""
        INSERT INTO {table_name} ({", ".join(unique_columns)})
        VALUES ({placeholders})
        ON CONFLICT ({", ".join(unique_columns)})
        DO UPDATE SET {update_clause}
        RETURNING {id_column}
        """
    )
    return int(conn.execute(sql, params).scalar_one())


def upsert_dimension_rows(
    conn,
    table_name: str,
    unique_columns: list[str],
    rows: list[dict],
    chunk_size: int = 500,
) -> int:
    if not rows:
        return 0

    placeholders = ", ".join(f":{column}" for column in unique_columns)
    update_clause = ", ".join(f"{column} = EXCLUDED.{column}" for column in unique_columns)
    sql = text(
        f"""
        INSERT INTO {table_name} ({", ".join(unique_columns)})
        VALUES ({placeholders})
        ON CONFLICT ({", ".join(unique_columns)})
        DO UPDATE SET {update_clause}
        """
    )

    total = 0
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i : i + chunk_size]
        params = [{column: row.get(column) for column in unique_columns} for row in chunk]
        conn.execute(sql, params)
        total += len(chunk)
    return total


def fetch_dimension_id_map(
    conn,
    table_name: str,
    id_column: str,
    unique_columns: list[str],
) -> dict[tuple, int]:
    sql = text(f"SELECT {id_column}, {', '.join(unique_columns)} FROM {table_name}")
    rows = conn.execute(sql).fetchall()

    id_map: dict[tuple, int] = {}
    for db_row in rows:
        key = tuple(db_row[idx + 1] for idx in range(len(unique_columns)))
        id_map[key] = int(db_row[0])
    return id_map


def upsert_fact_row(
    conn,
    table_name: str,
    id_column: str,
    row: dict,
    allowed_columns: list[str],
) -> None:
    data = {column: row.get(column) for column in allowed_columns if column in row}
    insert_columns = [id_column, *data.keys()]
    params = {id_column: row[id_column], **data}

    placeholders = ", ".join(f":{column}" for column in insert_columns)
    if data:
        set_clause = ", ".join(f"{column} = EXCLUDED.{column}" for column in data.keys())
        set_clause += ", updated_at = CURRENT_TIMESTAMP"
    else:
        set_clause = "updated_at = CURRENT_TIMESTAMP"

    sql = text(
        f"""
        INSERT INTO {table_name} ({", ".join(insert_columns)})
        VALUES ({placeholders})
        ON CONFLICT ({id_column})
        DO UPDATE SET {set_clause}
        """
    )
    conn.execute(sql, params)


def upsert_fact_rows(
    conn,
    table_name: str,
    id_column: str,
    rows: list[dict],
    allowed_columns: list[str],
    chunk_size: int = 500,
) -> int:
    if not rows:
        return 0

    data_columns = [column for column in allowed_columns if column != id_column]
    insert_columns = [id_column, *data_columns]
    placeholders = ", ".join(f":{column}" for column in insert_columns)

    if data_columns:
        set_clause = ", ".join(f"{column} = EXCLUDED.{column}" for column in data_columns)
        set_clause += ", updated_at = CURRENT_TIMESTAMP"
    else:
        set_clause = "updated_at = CURRENT_TIMESTAMP"

    sql = text(
        f"""
        INSERT INTO {table_name} ({", ".join(insert_columns)})
        VALUES ({placeholders})
        ON CONFLICT ({id_column})
        DO UPDATE SET {set_clause}
        """
    )

    total = 0
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i : i + chunk_size]
        params = []
        for row in chunk:
            payload = {id_column: row.get(id_column)}
            for column in data_columns:
                payload[column] = row.get(column)
            params.append(payload)
        conn.execute(sql, params)
        total += len(chunk)
    return total
