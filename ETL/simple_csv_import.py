#!/usr/bin/env python3
"""Simple CSV to Supabase import without dimension table complexity"""

import os
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

DB_URL = os.getenv('SUPABASE_DB_URL') or os.getenv('DATABASE_URL')
if not DB_URL:
    raise ValueError("SUPABASE_DB_URL or DATABASE_URL not set in .env")

engine = create_engine(DB_URL, echo=False)

csv_files = {
    'fact_rural_admin': 'DATA/CSV_EXPORT/fact_rural_admin.csv',
    'fact_rural_livelihood': 'DATA/CSV_EXPORT/fact_rural_livelihood.csv',
    'fact_rural_health': 'DATA/CSV_EXPORT/fact_rural_health.csv',
    'fact_rural_economy': 'DATA/CSV_EXPORT/fact_rural_economy.csv',
    'fact_rural_social': 'DATA/CSV_EXPORT/fact_rural_social.csv',
    'fact_rural_infra': 'DATA/CSV_EXPORT/fact_rural_infra.csv',
    'fact_rural_water': 'DATA/CSV_EXPORT/fact_rural_water.csv',
    'fact_rural_environment': 'DATA/CSV_EXPORT/fact_rural_environment.csv',
    'fact_rural_tourism': 'DATA/CSV_EXPORT/fact_rural_tourism.csv',
    'fact_urban_admin': 'DATA/CSV_EXPORT/fact_urban_admin.csv',
    'fact_urban_health': 'DATA/CSV_EXPORT/fact_urban_health.csv',
    'fact_urban_economy': 'DATA/CSV_EXPORT/fact_urban_economy.csv',
    'fact_urban_social': 'DATA/CSV_EXPORT/fact_urban_social.csv',
    'fact_urban_infra': 'DATA/CSV_EXPORT/fact_urban_infra.csv',
    'fact_urban_water': 'DATA/CSV_EXPORT/fact_urban_water.csv',
    'fact_urban_environment': 'DATA/CSV_EXPORT/fact_urban_environment.csv',
    'fact_urban_tourism': 'DATA/CSV_EXPORT/fact_urban_tourism.csv',
}

print("Starting CSV import to Supabase...")

for table_name, csv_path in csv_files.items():
    if not Path(csv_path).exists():
        print(f"⚠️  {table_name}: CSV not found at {csv_path}")
        continue
    
    try:
        df = pd.read_csv(csv_path)
        # Replace NaN with None for NULL in SQL
        df = df.where(pd.notna(df), None)
        
        # Convert numeric columns that might be stored as objects
        for col in df.columns:
            if col not in ['district', 'block', 'gram_panchayat', 'gp_id', 'ward_id', 'ulb', 'ward']:
                try:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                except:
                    pass
        
        # Use if_exists='replace' to overwrite, 'append' to add
        df.to_sql(table_name, con=engine, if_exists='replace', index=False, method='multi', chunksize=500)
        print(f"✅ {table_name}: Imported {len(df)} rows")
    except Exception as e:
        print(f"❌ {table_name}: Failed - {str(e)[:100]}")

print("\nImport complete!")
