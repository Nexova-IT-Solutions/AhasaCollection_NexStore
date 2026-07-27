"use client";

import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import { uploadFile } from "@/utils/supabase";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder, className }: MarkdownEditorProps) {
  async function onUploadImg(files: File[], callback: (urls: string[]) => void) {
    try {
      const res = await Promise.all(
        files.map((file) => uploadFile(file, "editor"))
      );
      callback(res);
    } catch (err: any) {
      console.error("Markdown Editor upload error:", err);
    }
  }

  return (
    <div className={cn("border border-input rounded-md overflow-hidden bg-white min-h-[400px] w-full", className)}>
      <MdEditor
        modelValue={value}
        onChange={onChange}
        placeholder={placeholder}
        onUploadImg={onUploadImg}
        language="en-US"
        theme="light"
        toolbars={[
          'bold',
          'italic',
          'underline',
          'strikeThrough',
          '-',
          'title',
          'sub',
          'sup',
          'quote',
          'unorderedList',
          'orderedList',
          'task',
          '-',
          'codeRow',
          'code',
          'link',
          'image',
          'table',
          '-',
          'revoke',
          'next',
          'save',
          '=',
          'pageFullscreen',
          'fullscreen',
          'preview',
          'catalog'
        ]}
        style={{ height: '400px' }}
        editorId="product-narrative-editor"
      />
    </div>
  );
}

