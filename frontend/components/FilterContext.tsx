'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UrbanFilter = 'all' | 'rural' | 'urban';

interface FilterContextType {
  selectedDistrict: string | null;
  urbanFilter: UrbanFilter;
  setSelectedDistrict: (district: string | null) => void;
  setUrbanFilter: (filter: UrbanFilter) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [urbanFilter, setUrbanFilter] = useState<UrbanFilter>('all');

  return (
    <FilterContext.Provider value={{ selectedDistrict, urbanFilter, setSelectedDistrict, setUrbanFilter }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
