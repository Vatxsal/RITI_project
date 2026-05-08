"use client"
import React from 'react'
import CSVDropzone from '../../components/upload/CSVDropzone'
import DataPreview from '../../components/upload/DataPreview'

export default function UploadPage(){
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Upload Aspirations</h1>
      <div className="grid grid-cols-2 gap-4">
        <CSVDropzone />
        <DataPreview />
      </div>
    </div>
  )
}
