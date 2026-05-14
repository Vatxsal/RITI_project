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

KEY_COLUMNS = ["district", "ulb", "ward"]
DIMENSION_TABLE = "dim_urban_wards"
DIMENSION_ID_COLUMN = "ward_id"
SOURCE_DIR = Path("DATA/RAW/URBAN_BASELINE")
WORKBOOK_NAME = "Urban_Ward_Final_Baseline.xlsx"
IGNORED_SOURCE_COLUMNS = {"वार्ड ID"}
CHUNK_SIZE = 500
MAX_WORKERS = 4

SHEET_CONFIGS = [
    {
        "sheet_name": "01_Population",
        "targets": [
            {
                "table_name": "fact_urban_admin",
                "mapping": {
                    "जिला": "district",
                    "ULB": "ulb",
                    "वार्ड": "ward",
                    "कुल जनसंख्या (Census 2011)": "pop_2011",
                    "कुल जनसंख्या (अनुमानित 2026)": "pop_2026_est",
                    "पुरुष जनसंख्या (अनुमानित 2026)": "male_pop_2026",
                    "महिला जनसंख्या (अनुमानित 2026)": "female_pop_2026",
                    "बच्चे (0-6 वर्ष) (अनुमानित 2026)": "children_0_6_2026",
                    "बच्चे (6-14 वर्ष) (अनुमानित 2026)": "children_6_14_2026",
                    "जनसँख्या (14-18 वर्ष) (अनुमानित 2026)": "pop_14_18_2026",
                    "वरिष्ठ नागरिक (60+) (अनुमानित 2026)": "senior_citizens_2026",
                    "विशेष योग्यजन (PwD) की संख्या (अनुमानित 2026)": "pwd_pop_2026",
                    "पक्के घरों की संख्या (अनुमानित- 2026)": "pucca_houses_2026",
                    "कच्चे घरों की संख्या (अनुमानित- 2026)": "kutcha_houses_2026",
                    "कुल भौगोलिक क्षेत्र (हैक्टेयर)": "total_area_hectare",
                },
            }
        ],
    },
    {
        "sheet_name": "02_Health",
        "targets": [
            {
                "table_name": "fact_urban_health",
                "mapping": {
                    "जिला": "district",
                    "ULB": "ulb",
                    "वार्ड": "ward",
                    "एलोपैथिक स्वास्थ्य केन्द्र / हॉस्पिटल की संख्या": "allopathic_centers",
                    "आयुष स्वास्थ्य केंद्र / हॉस्पिटल की संख्या": "ayush_centers",
                    "निजी स्वास्थ्य केन्द्र / हॉस्पिटल की संख्या": "pvt_health_centers",
                    "स्वास्थ्य केंद्र में बेड्स की संख्या": "health_center_beds",
                    "स्वास्थ्य केन्द्र पर कार्यरत स्वास्थ्य कर्मचारी (संख्या)": "working_health_staff",
                    "देखे गए मरीजों की औसत संख्या (प्रतिदिन)": "avg_daily_patients",
                    "मुख्य मंत्री आयुष्मान आरोग्य योजना के लाभार्थियों की संख्या": "ayushman_arogya_beneficiaries",
                    "कुल जन आधार मे पंजीकृत परिवार (प्रतिशत)": "janaadhar_reg_families_pct",
                    "TB के कुल वर्तमान मरीज (संख्या)": "tb_patients_count",
                    "कुल एनीमिक गर्भवती महिलाओं की संख्या": "anemic_pregnant_women",
                    "उच्च रक्तचाप हेतु स्क्रीनिंग किए गए व्यक्ति (संख्या, FY 2025-26)": "hypertension_screening_2025_26",
                    "मधुमेह (डायबीटीज) हेतु स्क्रीनिंग किए गए व्यक्ति (संख्या, FY 2025-26)": "diabetes_screening_2025_26",
                },
            }
        ],
    },
    {
        "sheet_name": "03_Anganwadi_ICDS",
        "targets": [
            {
                "table_name": "fact_urban_education",
                "mapping": {
                    "जिला": "district",
                    "ULB": "ulb",
                    "वार्ड": "ward",
                    "आंगनवाड़ी / मिनी आंगनवाड़ी केंद्रों की संख्या": "anganwadi_centers",
                    "आंगनवाड़ी/मिनी आंगनवाड़ी केंद्र में कार्यकर्ता की संख्या": "anganwadi_workers",
                    "आंगनवाड़ी/मिनी आंगनवाड़ी में नामांकित बच्चे (संख्या)": "anganwadi_enrolled_children",
                    "आशा सहयोगिनी की संख्या": "asha_sahyogini_count",
                    "गंभीर तीव्र कुपोषित (SAM) बच्चे (संख्या)": "sam_children_count",
                    "6–72 माह बच्चों को नियमित SNP (Supplementary Nutrition Programme) प्राप्त (संख्या)": "snp_recipients_6_72_months",
                },
            }
        ],
    },
    {
        "sheet_name": "04_Education",
        "targets": [
            {
                "table_name": "fact_urban_education",
                "mapping": {
                    "जिला": "district",
                    "ULB": "ulb",
                    "वार्ड": "ward",
                    "कुल राजकीय विद्यालयों की संख्या": "govt_schools_count",
                    "कुल निजी विद्यालयों की संख्या": "pvt_schools_count",
                    "कुल विद्यालय (संख्या)": "total_schools_count",
                    "विद्यालयों मे कुल नामांकित छात्र (संख्या)": "school_enrolled_students",
                    "उपलब्ध कुल उपयोगी कमरों की संख्या": "useful_rooms_count",
                    "कार्यरत शिक्षकों की कुल संख्या": "working_teachers",
                    "स्वीकृत शिक्षकों की कुल संख्या": "sanctioned_teachers_count",
                    "कंप्यूटर शिक्षा हेतु उपलब्ध कंप्यूटर की संख्या": "computers_available",
                    "पिछले वर्ष रिपोर्ट किए गए ड्रॉपआउट कुल बच्चे (संख्या)": "dropout_children_prev_year",
                    "सरकारी हॉस्टल की संख्या": "govt_hostels_count",
                },
            }
        ],
    },
    {
        "sheet_name": "05_Social_Welfare",
        "targets": [
            {
                "table_name": "fact_urban_social",
                "mapping": {
                    "जिला": "district",
                    "ULB": "ulb",
                    "वार्ड": "ward",
                    "पीएम उज्ज्वला योजना के लाभार्थी (संख्या)": "pm_ujjwala_beneficiaries",
                    "पीएम/सीएम आवास योजना के कुल लाभार्थी (संख्या)": "pm_cm_awas_beneficiaries",
                    "वृद्धावस्था पेंशन लाभार्थी (संख्या)": "old_age_pensioners",
                    "विधवा पेंशन लाभार्थी (संख्या)": "widow_pensioners",
                    "विशेष योग्यजन पेंशन लाभार्थी (अनुमानित संख्या)": "pwd_pensioners_est",
                },
            },
            {
                "table_name": "fact_urban_economy",
                "mapping": {
                    "जिला": "district",
                    "ULB": "ulb",
                    "वार्ड": "ward",
                    "कुल कार्यरत स्वयं सहायता समूह (संख्या)": "active_shg_count",
                    "स्थानीय कारीगरों की संख्या": "local_artisans_count",
                    "क्षेत्र में संचालित कुल वृहद औद्योगिक इकाई (संख्या)": "large_industrial_units",
                    "क्षेत्र में संचालित कुल लघु औद्योगिक इकाई (संख्या)": "small_scale_industries",
                },
            },
        ],
    },
    {
        "sheet_name": "06_Infrastructure",
        "targets": [
            {
                "table_name": "fact_urban_infra",
                "mapping": {
                    "जिला": "district",
                    "ULB": "ulb",
                    "वार्ड": "ward",
                    "कुल सरकारी बैंक (संख्या)": "govt_banks_count",
                    "निजी बैंक (संख्या)": "private_banks_count",
                    "कुल घर जिनमे विद्युत कनेक्शन है (संख्या)": "houses_with_electricity",
                    "सॉर ऊर्जा installed घर (संख्या)": "solar_installed_houses",
                    "उपयोग लायक सार्वजनिक शौचालय (संख्या)": "public_toilets_functional",
                    "सड़क की लंबाई(कि.मी.)": "road_length_km",
                    "मुख्य बाजार/हाट से दूरी (कि.मी.)": "dist_main_market_km",
                    "बस स्टैंड से वार्ड की दूरी(कि.मी.)": "dist_bus_stand_km",
                    "रेलवे स्टेशन से वार्ड की दूरी(कि.मी.)": "dist_railway_station_km",
                },
            },
            {
                "table_name": "fact_urban_governance",
                "mapping": {
                    "जिला": "district",
                    "ULB": "ulb",
                    "वार्ड": "ward",
                    "ई-मित्र की निकटतम दूरी(कि.मी.)": "dist_emitra_km",
                    "निकटतम पुलिस स्टेशन की  दूरी(कि.मी.)": "dist_police_station_km",
                },
            },
        ],
    },
    {
        "sheet_name": "07_Water",
        "targets": [
            {
                "table_name": "fact_urban_water",
                "mapping": {
                    "जिला": "district",
                    "ULB": "ulb",
                    "वार्ड": "ward",
                    "घरों में नल का चालू कनेक्शन (FHTC) (प्रतिशत में)": "tap_connection_pct",
                    "ओवरहेड टैंक की संख्या": "overhead_tanks_count",
                    "उपलब्ध जल स्रोतों (हैंडपंप) की संख्या": "handpumps_count",
                    "उपलब्ध जल स्रोतों (कुआँ) की संख्या": "wells_count",
                    "उपलब्ध जल स्रोतों (टैंक) की संख्या": "tanks_count",
                    "भूजल दोहन की स्थिति (भूजल टेबल के अनुसार)(मीटर में)": "groundwater_depth_meters",
                    "जल गुणवत्ता परीक्षण की वार्षिक आवृति": "water_quality_test_frequency",
                },
            }
        ],
    },
    {
        "sheet_name": "08_Environment",
        "targets": [
            {
                "table_name": "fact_urban_environment",
                "mapping": {
                    "जिला": "district",
                    "ULB": "ulb",
                    "वार्ड": "ward",
                    "शोचालय से वंचित कुल घरों की संख्या": "houses_without_toilets",
                    "compost pits की संख्या (सरकारी)": "govt_compost_pits_count",
                    "सरकारी नर्सरी की उपलब्धता (संख्या)": "govt_nurseries_count",
                    "नर्सरी मे उपलब्ध पौधे (संख्या)": "nursery_saplings_available",
                },
            }
        ],
    },
    {
        "sheet_name": "09_Tourism",
        "targets": [
            {
                "table_name": "fact_urban_tourism",
                "mapping": {
                    "जिला": "district",
                    "ULB": "ulb",
                    "वार्ड": "ward",
                    "प्रमुख मेलों में औसत फुटफॉल(प्रति दिवस)": "avg_fair_footfall_daily",
                    "SHG द्वारा संचालित स्टॉल/सेवाओं की संख्या (अनुमानित)": "shg_operated_stalls",
                    "प्रशिक्षित गाइड का पंजीकरण (अनुमानित संख्या)": "registered_trained_guides",
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
