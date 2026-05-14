from __future__ import annotations

import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine

from baseline_pipeline_common import (
    NUMERIC_SQL_TYPES,
    build_target_frame,
    combine_frames,
    coerce_numeric_columns,
    fetch_dimension_id_map,
    get_table_column_types,
    load_workbook_sheets,
    upsert_dimension_rows,
    upsert_fact_rows,
)

load_dotenv()

KEY_COLUMNS = ["district", "block", "gram_panchayat"]
DIMENSION_TABLE = "dim_rural_gps"
DIMENSION_ID_COLUMN = "gp_id"
SOURCE_DIR = Path("DATA/RAW/RURAL_BASELINE")
WORKBOOK_NAME = "Rural_GP_Final_Baseline.xlsx"
IGNORED_SOURCE_COLUMNS = {"gp_id", "district_hi", "block_hi", "gp_hi"}
CHUNK_SIZE = 500
MAX_WORKERS = 4

SHEET_CONFIGS = [
    {
        "sheet_name": "01_Population",
        "targets": [
            {
                "table_name": "fact_rural_admin",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "pop_census2011": "pop_2011",
                    "pop_est2026": "pop_2026_est",
                    "pop_male": "male_pop_2026",
                    "pop_female": "female_pop_2026",
                    "children_0_6": "children_0_6_2026",
                    "children_6_14": "children_6_14_2026",
                    "pop_14_18": "pop_14_18_2026",
                    "senior_60plus": "senior_citizens_2026",
                    "pwd_count": "pwd_pop_2026",
                    "total_families": "total_families_2026",
                    "bpl_families": "bpl_families_count",
                    "nfsa_families": "nfsa_beneficiary_families",
                    "pucca_houses": "pucca_houses_2026",
                    "kachha_houses": "kutcha_houses_2026",
                },
            }
        ],
    },
    {
        "sheet_name": "02_Agriculture",
        "targets": [
            {
                "table_name": "fact_rural_livelihood",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "agri_land_ha": "cultivable_land_hectare",
                    "irrigated_area_ha": "irrigated_area_hectare",
                    "net_sown_area_ha": "net_sown_area",
                    "kharif_area_ha": "kharif_area_hectare",
                    "kharif_production_qtl": "kharif_production_quintal",
                    "rabi_area_ha": "rabi_area_hectare",
                    "rabi_production_qtl": "rabi_production_quintal",
                    "total_farmers": "total_farmers_count",
                    "small_farmers": "small_farmers_count",
                    "medium_farmers": "medium_farmers_count",
                    "large_farmers": "large_farmers_count",
                    "kcc_holders": "kcc_holders_count",
                    "pm_kisan_beneficiaries": "pm_cm_kisan_beneficiaries",
                    "soil_health_cards": "soil_health_cards_valid",
                    "crop_insurance_farmers": "crop_insurance_farmers",
                    "fpo_count": "fpo_count",
                    "drip_sprinkler_farmers": "drip_sprinkler_farmers",
                    "solar_pumps": "solar_pumps_count",
                    "agri_electric_connections": "agri_electricity_conn",
                    "vet_centers": "govt_vet_centers",
                },
            }
        ],
    },
    {
        "sheet_name": "03_Livestock",
        "targets": [
            {
                "table_name": "fact_rural_livelihood",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "total_livestock": "total_livestock_count",
                    "milch_animals": "milch_animals_count",
                    "milk_production_lpd": "daily_milk_prod_litres",
                    "milk_collection_centers": "milk_collection_centers",
                    "goat_farms": "goat_farms_count",
                    "poultry_farms": "poultry_farms_count",
                    "horticulture_area_ha": "horticulture_area",
                    "organic_farming_area_ha": "organic_farming_area",
                    "livestock_insurance": "mangla_pashu_bima_ben",
                },
            }
        ],
    },
    {
        "sheet_name": "04_Health",
        "targets": [
            {
                "table_name": "fact_rural_health",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "allopathic_centers": "allopathic_centers",
                    "ayush_centers": "ayush_centers",
                    "pvt_health_centers": "private_health_centers",
                    "health_beds": "health_center_beds",
                    "health_workers_active": "working_health_staff",
                    "avg_daily_patients": "avg_daily_patients",
                    "ayushman_beneficiaries": "ayushman_arogya_beneficiaries",
                    "jan_aadhar_pct": "janaadhar_registered_families_pct",
                    "tb_cases": "tb_patients_count",
                    "anemic_pregnant": "anemic_pregnant_women",
                    "phc_dist_km": "phc_dist_km",
                    "chc_dist_km": "chc_dist_km",
                },
            }
        ],
    },
    {
        "sheet_name": "05_Anganwadi_ICDS",
        "targets": [
            {
                "table_name": "fact_rural_education",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "anganwadi_centers": "anganwadi_centers",
                    "anganwadi_workers": "anganwadi_workers",
                    "anganwadi_helpers": "anganwadi_helpers",
                    "anganwadi_enrolled": "anganwadi_enrolled_children",
                    "anganwadi_pregnant": "anganwadi_pregnant_women",
                    "asha_workers": "asha_sahyogini_count",
                    "sam_children": "sam_children_count",
                },
            }
        ],
    },
    {
        "sheet_name": "06_Education",
        "targets": [
            {
                "table_name": "fact_rural_education",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "govt_schools": "govt_schools_count",
                    "pvt_schools": "pvt_schools_count",
                    "total_schools": "total_schools_count",
                    "school_rooms": "useful_rooms_count",
                    "teachers_active": "working_teachers",
                    "teachers_sanctioned": "sanctioned_teachers_count",
                    "school_computers": "computers_available",
                    "enrolled_students": "total_enrolled_students",
                    "boys_class_0_5": "enrolled_boys_0_5",
                    "girls_class_0_5": "enrolled_girls_0_5",
                    "boys_class_6_8": "enrolled_boys_6_8",
                    "girls_class_6_8": "enrolled_girls_6_8",
                    "boys_class_9_10": "enrolled_boys_9_10",
                    "girls_class_9_10": "enrolled_girls_9_10",
                    "boys_class_11_12": "enrolled_boys_11_12",
                    "girls_class_11_12": "enrolled_girls_11_12",
                    "dropout_children": "dropout_children_prev_year",
                    "skill_centers": "skill_training_centers",
                    "govt_hostels": "govt_hostels_count",
                    "colleges_count": "higher_edu_institutes",
                },
            }
        ],
    },
    {
        "sheet_name": "07_Social_Welfare",
        "targets": [
            {
                "table_name": "fact_rural_social",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "old_age_pension": "old_age_pensioners",
                    "widow_pension": "widow_pensioners",
                    "pwd_pension": "pwd_pensioners_est",
                    "ujjwala_beneficiaries": "pm_ujjwala_beneficiaries",
                    "pm_cm_awas": "pm_cm_awas_beneficiaries",
                },
            },
            {
                "table_name": "fact_rural_economy",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "shg_count": "active_shg_count",
                    "shg_women": "women_in_shgs",
                    "lakhpati_didi": "lakhpati_didis_count",
                    "millionaire_didi": "millionaire_didis_count",
                    "local_artisans": "local_artisans_count",
                    "large_industries": "large_industrial_units",
                    "mudra_loan_beneficiaries": "mudra_loan_beneficiaries",
                },
            },
        ],
    },
    {
        "sheet_name": "08_Infrastructure",
        "targets": [
            {
                "table_name": "fact_rural_infra",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "post_offices": "post_offices_count",
                    "govt_banks": "govt_banks_count",
                    "pvt_banks": "private_banks_count",
                    "hh_with_electricity": "houses_with_electricity",
                    "electricity_hrs_day": "avg_electricity_hours_daily",
                    "street_lights": "total_street_lights",
                    "solar_homes": "solar_installed_houses",
                    "public_toilets": "public_toilets",
                    "road_length_km": "road_length_km",
                    "bus_stand_dist_km": "dist_bus_stand_km",
                    "market_dist_km": "dist_main_market_km",
                    "railway_dist_km": "dist_railway_station_km",
                },
            },
            {
                "table_name": "fact_rural_governance",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "police_dist_km": "dist_police_station_km",
                    "emitra_dist_km": "dist_emitra_km",
                    "lpg_dist_km": "dist_lpg_distributor_km",
                },
            },
        ],
    },
    {
        "sheet_name": "09_Water",
        "targets": [
            {
                "table_name": "fact_rural_water",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "fhtc_pct": "tap_connection_pct",
                    "overhead_tanks": "overhead_tanks_count",
                    "handpump_hh": "handpump_tubewell_only_houses",
                    "drinking_water_sources": "drinking_water_sources",
                    "groundwater_depth_m": "groundwater_depth_meters",
                    "ro_facilities": "ro_facilities",
                    "water_quality_tests": "water_quality_test_frequency",
                    "tanker_hh": "tanker_only_supply_houses",
                },
            }
        ],
    },
    {
        "sheet_name": "10_Environment",
        "targets": [
            {
                "table_name": "fact_rural_environment",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "hh_with_toilet": "houses_with_toilets",
                    "door_to_door_hh": "door_to_door_collection_houses",
                    "waste_dump_sites": "waste_dump_sites",
                    "total_waste_kg_day": "total_waste_daily_kg",
                    "wet_waste_kg_day": "wet_waste_daily_kg",
                    "dry_waste_kg_day": "dry_waste_daily_kg",
                    "compost_pits_govt": "govt_compost_pits_count",
                    "mrf_sheds": "mrf_sheds_count",
                    "biogas_plants": "biogas_plants_count",
                    "grazing_land_ha": "pasture_land_hectare",
                    "forest_area_ha": "forest_area_hectare",
                    "solar_panel_homes": "pm_surya_ghar_solar_houses",
                },
            }
        ],
    },
    {
        "sheet_name": "11_Tourism",
        "targets": [
            {
                "table_name": "fact_rural_tourism",
                "mapping": {
                    "district_eng": "district",
                    "block_eng": "block",
                    "gp_eng": "gram_panchayat",
                    "heritage_sites": "cultural_assets_count",
                    "religious_footfall": "avg_daily_footfall_cultural_sites",
                    "annual_fairs": "annual_fairs_count",
                    "fair_footfall": "avg_fair_footfall_daily",
                    "fair_stalls": "temporary_fair_stalls",
                    "stall_vendors": "fair_related_employment",
                    "trained_guides": "registered_trained_guides",
                },
            }
        ],
    },
]


def _sheet_source_columns(sheet_config: dict) -> set[str]:
    columns: set[str] = set()
    for target in sheet_config["targets"]:
        columns.update(target["mapping"].keys())
    return columns


def _collect_table_frames(all_sheets: dict[str, object]) -> tuple[dict[str, list], list]:
    table_frames: dict[str, list] = {}
    key_frames: list = []

    for sheet_config in SHEET_CONFIGS:
        sheet_name = sheet_config["sheet_name"]
        if sheet_name not in all_sheets:
            print(f"{sheet_name}: not found in workbook, skipping")
            continue

        df = all_sheets[sheet_name]
        allowed_source_columns = _sheet_source_columns(sheet_config) | IGNORED_SOURCE_COLUMNS
        extras = sorted(column for column in df.columns if column not in allowed_source_columns)
        if extras:
            print(f"{sheet_config['sheet_name']}: skipping {len(extras)} unmatched columns: {extras}")

        for target in sheet_config["targets"]:
            frame = build_target_frame(df, target["mapping"], KEY_COLUMNS)
            table_frames.setdefault(target["table_name"], []).append(frame)
            key_frames.append(frame[KEY_COLUMNS])

    return table_frames, key_frames


def _process_table_task(
    engine,
    table_name: str,
    frames: list,
    dimension_id_by_key: dict[tuple[str, str, str], int],
    table_columns: dict[str, str],
) -> dict[str, object]:
    try:
        t0 = time.time()
        # Engine is shared; no need to create new one per thread
        t1 = time.time()

        combined = combine_frames(frames, KEY_COLUMNS)
        t2 = time.time()

        if combined.empty:
            return {"table_name": table_name, "upserted": 0, "missing_keys": 0, "skipped_columns": [], "error": None}

        with engine.begin() as conn:
            t3 = time.time()
            # table_columns is pre-fetched; no need to query schema per thread
            t4 = time.time()

            active_fact_columns = [
                column for column in combined.columns if column in table_columns and column not in KEY_COLUMNS
            ]
            missing_in_db = [
                column for column in combined.columns if column not in KEY_COLUMNS and column not in table_columns
            ]

            numeric_columns = [
                column
                for column in active_fact_columns
                if table_columns.get(column, "").lower() in NUMERIC_SQL_TYPES
            ]
            combined = coerce_numeric_columns(combined, numeric_columns)

            fact_rows = []
            missing_keys = 0
            for row in combined.to_dict(orient="records"):
                key = tuple(row[column] for column in KEY_COLUMNS)
                dim_id = dimension_id_by_key.get(key)
                if dim_id is None:
                    missing_keys += 1
                    continue
                fact_rows.append({**row, DIMENSION_ID_COLUMN: dim_id})

            upserted = upsert_fact_rows(
                conn,
                table_name=table_name,
                id_column=DIMENSION_ID_COLUMN,
                rows=fact_rows,
                allowed_columns=active_fact_columns,
                chunk_size=CHUNK_SIZE,
            )
            t5 = time.time()

            print(f"  [{table_name}] engine_create={t1-t0:.3f}s | combine={t2-t1:.3f}s | "
                  f"conn_open={t3-t2:.3f}s | get_col_types={t4-t3:.3f}s | upsert={t5-t4:.3f}s")

        return {
            "table_name": table_name,
            "upserted": upserted,
            "missing_keys": missing_keys,
            "skipped_columns": missing_in_db,
            "error": None,
        }
    except Exception as exc:  # pragma: no cover
        return {
            "table_name": table_name,
            "upserted": 0,
            "missing_keys": 0,
            "skipped_columns": [],
            "error": str(exc),
        }


def run_pipeline() -> None:
    started = time.time()
    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        raise ValueError("SUPABASE_DB_URL is not set in .env")

    workbook_path = SOURCE_DIR / WORKBOOK_NAME
    if not workbook_path.exists():
        raise FileNotFoundError(f"Source file not found: {workbook_path}")

    print(f"Reading workbook in one pass: {workbook_path.name}")
    read_started = time.time()
    all_sheets = load_workbook_sheets(workbook_path)
    print(f"Workbook loaded in {time.time() - read_started:.1f}s ({len(all_sheets)} sheets)")

    # Create ONE shared engine with connection pooling (Fix B)
    engine = create_engine(
        db_url,
        pool_size=MAX_WORKERS + 2,
        max_overflow=2,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={"connect_timeout": 60, "options": "-c statement_timeout=300000"},
    )

    table_frames, key_frames = _collect_table_frames(all_sheets)
    dimension_rows = combine_frames(key_frames, KEY_COLUMNS)

    with engine.begin() as conn:
        dim_upserted = upsert_dimension_rows(
            conn,
            table_name=DIMENSION_TABLE,
            unique_columns=KEY_COLUMNS,
            rows=dimension_rows.to_dict(orient="records"),
            chunk_size=CHUNK_SIZE,
        )
        dimension_id_by_key = fetch_dimension_id_map(
            conn,
            table_name=DIMENSION_TABLE,
            id_column=DIMENSION_ID_COLUMN,
            unique_columns=KEY_COLUMNS,
        )

        # Pre-fetch ALL table column types once before spawning threads (Fix A)
        print("Pre-fetching schema metadata for all tables...")
        all_table_columns: dict[str, dict[str, str]] = {}
        for table_name in table_frames.keys():
            all_table_columns[table_name] = get_table_column_types(conn, table_name)

    print(f"{DIMENSION_TABLE}: upserted {dim_upserted} rows")
    print(f"Processing {len(table_frames)} tables in parallel (workers={MAX_WORKERS}, chunk={CHUNK_SIZE})")

    total = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(
                _process_table_task,
                engine,
                table_name,
                frames,
                dimension_id_by_key,
                all_table_columns[table_name],
            ): table_name
            for table_name, frames in table_frames.items()
        }

        for future in as_completed(futures):
            result = future.result()
            table_name = result["table_name"]
            if result["error"]:
                print(f"{table_name}: ERROR - {result['error']}")
                continue
            if result["skipped_columns"]:
                print(f"{table_name}: skipping {len(result['skipped_columns'])} mapped columns not present in DB yet")
            if result["missing_keys"]:
                print(f"{table_name}: skipped {result['missing_keys']} rows with missing {DIMENSION_ID_COLUMN}")
            print(f"{table_name}: upserted {result['upserted']} rows from {workbook_path.name}")
            total += int(result["upserted"])

    print(f"Pipeline complete. Total thematic rows processed: {total}")
    print(f"Total runtime: {time.time() - started:.1f}s")


if __name__ == "__main__":
    run_pipeline()
