"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  value: (string | File)[];
  onChange: (value: (string | File)[]) => void;
  multiple?: boolean;
}

export function ImageUpload({ value, onChange, multiple = false }: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  // Correctly handle previews for both URLs and File objects
  useEffect(() => {
    const newPreviews = value.map((item) => {
      if (typeof item === "string") return item;
      return URL.createObjectURL(item);
    });
    setPreviews(newPreviews);

    // Clean up memory
    return () => {
      newPreviews.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [value]);

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (multiple) {
      onChange([...value, ...files]);
    } else {
      onChange([files[0]]);
    }
  };

  const handleRemove = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {previews.map((url, i) => (
          <div key={i} className="relative w-24 h-24 rounded-xl border border-brand-border bg-gray-50 group overflow-hidden shadow-sm hover:shadow-md transition-all">
            <Image src={url} alt={`Preview ${i}`} fill className="object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute top-1 right-1 p-1 bg-white/90 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm border border-red-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {(multiple || value.length === 0) && (
          <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-brand-border bg-[#FAFAFA] flex flex-col items-center justify-center gap-1 hover:bg-[#FCEAF4] group transition-colors cursor-pointer overflow-hidden">
            <Upload className="w-6 h-6 text-[#A7066A] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-[#6B5A64] uppercase tracking-tighter group-hover:text-[#A7066A]">Add Photo</span>
            <input
              type="file"
              accept="image/*"
              multiple={multiple}
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleSelectFiles}
            />
          </div>
        )}
      </div>
      
      {value.length > 0 && (
         <p className="text-[10px] font-bold text-[#A7066A] uppercase tracking-widest flex items-center gap-1">
           <ImageIcon className="w-3 h-3" />
           {value.length} image{value.length > 1 ? 's' : ''} staged for upload
         </p>
      )}
    </div>
  );
}
