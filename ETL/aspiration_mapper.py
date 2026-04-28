import os
import json
from pathlib import Path
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

category_map = {
    'स्वास्थ्य एवं कल्याण': 'Health',
    'शिक्षा संबंधी जानकारी': 'Education',
    'प्रशासनिक एवं जनसांख्यिकीय विवरण': 'Admin',
    'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित': 'Infrastructure',
    'जल सुरक्षा और समुदाय आधारित क्षमता': 'Water_Security',
    'औद्योगिक, खनन और आर्थिक विकास': 'Economic_Development',
    'सामाजिक सशक्तिकरण और समावेशन': 'Social_Inclusion',
    'पर्यावरणीय स्थिरता और जलवायु अनुकूलता': 'Environment',
    'पर्यटन एवं सांस्कृतिक विकास': 'Tourism',
    'कृषि और संबद्ध गतिविधियाँ': 'Agriculture',
    'प्रभावी शासन और सार्वजनिक सेवाएं': 'Governance'
}


RURAL_DIR = Path("DATA/RAW/RURAL_ASPIRATIONS")
URBAN_DIR = Path("DATA/RAW/URBAN_ASPIRATIONS")


def normalize_text(x):
    if pd.isna(x):
        return None
    s = str(x).strip()
    if s == "":
        return None
    return s


def normalize_key(x):
    """Lowercase + strip for join keys."""
    v = normalize_text(x)
    return v.lower() if v else None


def null_if_zero(val):
    try:
        if pd.isna(val):
            return None
        # treat numeric zero or string '0' as null
        if float(val) == 0.0:
            return None
    except Exception:
        pass
    v = normalize_text(val)
    return v


def connect_db():
    load_dotenv()
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        raise RuntimeError("SUPABASE_DB_URL not found in environment")
    engine = create_engine(db_url)
    return engine


def lookup_gp_id(conn, district, block, gp_name):
    if not (district and block and gp_name):
        return None
    sql = text("""
    SELECT gp_id FROM dim_rural_gps
    WHERE lower(district)=:district
      AND lower(block)=:block
      AND lower(gram_panchayat)=:gp
    LIMIT 1
    """)
    r = conn.execute(sql, {"district": district, "block": block, "gp": gp_name}).fetchone()
    return int(r[0]) if r else None


def lookup_ward_id(conn, district, ulb, ward):
    if not (district and ulb and ward):
        return None
    sql = text("""
    SELECT ward_id FROM dim_urban_wards
    WHERE lower(district)=:district
      AND lower(ulb)=:ulb
      AND lower(ward)=:ward
    LIMIT 1
    """)
    r = conn.execute(sql, {"district": district, "ulb": ulb, "ward": ward}).fetchone()
    return int(r[0]) if r else None


def map_rural_row(row, category_hi, category_en):
    # Map Hindi columns to canonical DB columns
    sub = row.get('सब-इंडिकेटर्स') or row.get('सब इंडिकेटर्स') or row.get('सब इंडिकेटर')
    other_sub = row.get('अन्य सब-इंडिकेटर') or row.get('अन्य सब इंडिकेटर')
    priority = row.get('प्राथमिकता स्तर') or row.get('प्राथमिकता')
    t2030 = row.get('2030')
    t2030_35 = row.get('2030-35') or row.get('2030 - 35')
    t2035_47 = row.get('2035-47') or row.get('2035 - 47')
    fin = row.get('वित्तीय स्वीकृति') or row.get('वित्तीय स्वीकृति (हाँ/नहीं)')
    raj_ref = row.get('राजधारा संदर्भ संख्या') or row.get('राजधारा संदर्भ क्रमांक')
    raj_uid = row.get('राजधारा यूनिक क्रमांक')
    scheme = row.get('योजना का नाम') or row.get('योजना नाम') or None
    lat = null_if_zero(row.get('अक्षांश मान') or row.get('latitude'))
    lon = null_if_zero(row.get('देशांतर मान') or row.get('longitude'))
    remarks_parts = []
    if other_sub:
        remarks_parts.append(f"other_sub_indicator: {other_sub}")
    if raj_uid:
        remarks_parts.append(f"rajdhara_unique_id: {raj_uid}")
    remarks = "; ".join(remarks_parts) if remarks_parts else None

    mapped = {
        'category_en': category_en,
        'category_hi': category_hi,
        'sub_indicator': normalize_text(sub) if sub else None,
        'priority_level': int(priority) if (not pd.isna(priority) and str(priority).strip().isdigit()) else None,
        'target_2030': normalize_text(t2030),
        'target_2030_35': normalize_text(t2030_35),
        'target_2035_47': normalize_text(t2035_47),
        'financial_approval': normalize_text(fin),
        'scheme_name': normalize_text(scheme),
        'rajdhara_ref_no': normalize_text(raj_ref),
        'latitude': lat,
        'longitude': lon,
        'remarks': remarks
    }
    return mapped


def map_urban_row(row, category_hi, category_en):
    # reuse rural mapping where possible
    return map_rural_row(row, category_hi, category_en)


def process_directory(engine, dir_path: Path, is_rural: bool):
    if not dir_path.exists():
        print(f"Directory {dir_path} does not exist, skipping.")
        return

    files = [p for p in dir_path.iterdir() if p.suffix.lower() in ('.xlsx', '.xls')]
    if not files:
        print(f"No Excel files found in {dir_path}")
        return

    table_name = 'fact_rural_aspirations' if is_rural else 'fact_urban_aspirations'

    with engine.begin() as conn:
        for f in files:
            fname = f.stem
            cat_hi = fname
            cat_en = category_map.get(fname, 'Other')
            print(f"Processing {f.name} as category {cat_en} ({cat_hi})")

            try:
                df = pd.read_excel(f, header=2, engine='openpyxl')
            except Exception:
                df = pd.read_excel(f, header=2)

            # normalize column names (strip)
            df.columns = [str(c).strip() for c in df.columns]

            rows = []
            for _, r in df.iterrows():
                if is_rural:
                    district = normalize_key(r.get('जिला') or r.get('जिला/जनपद') or r.get('District'))
                    block = normalize_key(r.get('ब्लॉक') or r.get('Block'))
                    gp = normalize_key(r.get('ग्राम पंचायत') or r.get('ग्रामपंचायत') or r.get('Gram Panchayat'))
                    gid = lookup_gp_id(conn, district, block, gp)
                    mapped = map_rural_row(r, cat_hi, cat_en)
                    mapped['gp_id'] = gid
                else:
                    district = normalize_key(r.get('जिला') or r.get('District'))
                    ulb = normalize_key(r.get('ULB') or r.get('ULB/नगरपालिका') or r.get('ULB Name'))
                    ward = normalize_key(r.get('वार्ड') or r.get('Ward'))
                    wid = lookup_ward_id(conn, district, ulb, ward)
                    mapped = map_urban_row(r, cat_hi, cat_en)
                    mapped['ward_id'] = wid

                rows.append(mapped)

            out_df = pd.DataFrame(rows)

            # Ensure columns match DB table
            allowed_cols = [
                'gp_id', 'ward_id', 'category_en', 'category_hi', 'sub_indicator', 'priority_level',
                'target_2030', 'target_2030_35', 'target_2035_47', 'financial_approval', 'scheme_name',
                'rajdhara_ref_no', 'latitude', 'longitude', 'remarks'
            ]
            out_df = out_df[[c for c in allowed_cols if c in out_df.columns]]

            # Convert empty strings to None for SQL insertion
            out_df = out_df.where(pd.notnull(out_df), None)

            try:
                out_df.to_sql(table_name, con=engine, if_exists='append', index=False, method='multi')
                print(f"Appended {len(out_df)} rows to {table_name} from {f.name}")
            except Exception as e:
                print(f"Failed to append {f.name} to {table_name}: {e}")


def main():
    engine = connect_db()
    print("Connected to DB")
    process_directory(engine, RURAL_DIR, is_rural=True)
    process_directory(engine, URBAN_DIR, is_rural=False)


if __name__ == '__main__':
    main()
