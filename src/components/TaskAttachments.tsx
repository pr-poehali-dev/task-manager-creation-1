import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import type { Attachment } from "@/lib/task-store";
import {
  fetchAttachments,
  uploadAttachment,
  deleteAttachment,
  formatFileSize,
  getFileIcon,
} from "@/lib/task-store";
import FilePreview, { isPreviewable } from "./FilePreview";

interface TaskAttachmentsProps {
  taskId: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAttachments(taskId).then((data) => {
      setFiles(data);
      setLoading(false);
    });
  }, [taskId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    const newFiles: Attachment[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > MAX_FILE_SIZE) continue;
      const att = await uploadAttachment(taskId, file);
      newFiles.push(att);
    }
    setFiles((prev) => [...newFiles, ...prev]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    await deleteAttachment(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClick = (file: Attachment) => {
    if (isPreviewable(file.contentType)) {
      setPreview(file);
    } else {
      window.open(file.cdnUrl, "_blank");
    }
  };

  const isImg = (ct: string) => ct.startsWith("image/");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Icon name="Paperclip" size={12} />
          Файлы
          {files.length > 0 && (
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
              {files.length}
            </span>
          )}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Icon name="Loader2" size={12} className="animate-spin" />
          ) : (
            <Icon name="Upload" size={12} />
          )}
          {uploading ? "Загрузка..." : "Добавить"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar"
          onChange={handleUpload}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed rounded-lg p-4 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
        >
          <Icon name="CloudUpload" size={24} className="opacity-40" />
          <span className="text-xs">Перетащите файлы или нажмите для загрузки</span>
          <span className="text-[10px] opacity-60">PDF, Word, Excel, изображения · до 10 МБ</span>
        </button>
      ) : (
        <div className="space-y-1.5">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2.5 p-2 rounded-md border bg-muted/30 group hover:bg-muted/50 transition-colors"
            >
              <button
                onClick={() => handleClick(file)}
                className="shrink-0 w-10 h-10 rounded overflow-hidden flex items-center justify-center bg-background border hover:border-primary/40 transition-colors cursor-pointer"
              >
                {isImg(file.contentType) ? (
                  <img src={file.cdnUrl} alt={file.fileName} className="w-full h-full object-cover" />
                ) : (
                  <Icon name={getFileIcon(file.contentType)} size={18} className="text-muted-foreground" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleClick(file)}
                  className="text-xs font-medium hover:underline truncate block text-left w-full"
                >
                  {file.fileName}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </span>
                  {isPreviewable(file.contentType) && (
                    <span className="text-[10px] text-primary/60 flex items-center gap-1">
                      <Icon name="Eye" size={11} />
                      превью
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isPreviewable(file.contentType) && (
                  <button
                    onClick={() => setPreview(file)}
                    className="px-2 py-1 rounded text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    Просмотр
                  </button>
                )}
                <a
                  href={file.cdnUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 rounded text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Скачать
                </a>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="px-2 py-1 rounded text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full border border-dashed rounded-md p-2 flex items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer text-xs"
          >
            {uploading ? (
              <Icon name="Loader2" size={12} className="animate-spin" />
            ) : (
              <Icon name="Plus" size={12} />
            )}
            {uploading ? "Загрузка..." : "Ещё файл"}
          </button>
        </div>
      )}

      <FilePreview file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}