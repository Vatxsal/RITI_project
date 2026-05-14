"""
enrich_csv_with_ids.py
After dim tables are populated in Supabase, add gp_id/ward_id to fact table CSVs.
Run: python ETL/enrich_csv_with_ids.py
"""
from __future__ import annotations
import os
from pathlib import Path

import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
OUTPUT_DIR = Path("DATA/CSV_EXPORT")


def enrich_with_ids():
    """Fetch gp_id/ward_id from Supabase and add to fact CSVs."""
    sb = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )

    # Fetch rural GP ID map
    print("Fetching gp_id map from Supabase...")
    result = sb.table("dim_rural_gps").select("gp_id, district, block, gram_panchayat").execute()
    gp_map = {
        (r["district"], r["block"], r["gram_panchayat"]): r["gp_id"]
        for r in result.data
    }
    print(f"  {len(gp_map)} GPs loaded")

    # Enrich all rural fact CSVs
    rural_tables = [
        "fact_rural_admin", "fact_rural_livelihood", "fact_rural_health",
        "fact_rural_education", "fact_rural_social", "fact_rural_economy",
        "fact_rural_infra", "fact_rural_governance", "fact_rural_water",
        "fact_rural_environment", "fact_rural_tourism"
    ]

    print("\nEnriching rural CSVs with gp_id...")
    for table in rural_tables:
        path = OUTPUT_DIR / f"{table}.csv"
        if not path.exists():
            continue
        df = pd.read_csv(path, dtype=str)
        df["gp_id"] = df.apply(
            lambda r: gp_map.get((r.get("district",""), r.get("block",""), r.get("gram_panchayat",""))),
            axis=1
        )
        missing = df["gp_id"].isna().sum()
        if missing:
            print(f"  ⚠ {table}: {missing} rows have no gp_id match")
        df = df.dropna(subset=["gp_id"])
        # Drop name key cols — Supabase fact tables only need gp_id
        df = df.drop(columns=["district", "block", "gram_panchayat"], errors="ignore")
        df.to_csv(path, index=False, encoding="utf-8-sig")
        print(f"  ✅ {table}: enriched with gp_id ({len(df)} rows)")

    # Fetch urban ward ID map
    print("\nFetching ward_id map from Supabase...")
    result2 = sb.table("dim_urban_wards").select("ward_id, district, ulb, ward").execute()
    ward_map = {
        (r["district"], r["ulb"], r["ward"]): r["ward_id"]
        for r in result2.data
    }
    print(f"  {len(ward_map)} wards loaded")

    # Enrich all urban fact CSVs
    urban_tables = [
        "fact_urban_admin", "fact_urban_health", "fact_urban_education",
        "fact_urban_social", "fact_urban_economy", "fact_urban_infra",
        "fact_urban_governance", "fact_urban_water", "fact_urban_environment",
        "fact_urban_tourism"
    ]

    print("\nEnriching urban CSVs with ward_id...")
    for table in urban_tables:
        path = OUTPUT_DIR / f"{table}.csv"
        if not path.exists():
            continue
        df = pd.read_csv(path, dtype=str)
        df["ward_id"] = df.apply(
            lambda r: ward_map.get((r.get("district",""), r.get("ulb",""), r.get("ward",""))),
            axis=1
        )
        missing = df["ward_id"].isna().sum()
        if missing:
            print(f"  ⚠ {table}: {missing} rows have no ward_id match")
        df = df.dropna(subset=["ward_id"])
        df = df.drop(columns=["district", "ulb", "ward"], errors="ignore")
        df.to_csv(path, index=False, encoding="utf-8-sig")
        print(f"  ✅ {table}: enriched with ward_id ({len(df)} rows)")

    print("\n✅ All CSVs enriched with IDs. Ready to import into Supabase.")
    print("Import order: dim tables → all fact tables via Table Editor → Import CSV")


if __name__ == "__main__":
    enrich_with_ids()
