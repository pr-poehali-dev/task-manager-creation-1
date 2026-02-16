import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import type { Attachment } from "@/lib/task-store";
import { formatFileSize } from "@/lib/task-store";

interface FilePreviewProps {
  file: Attachment | null;
  onClose: () => void;
}

function isImage(ct: string) {
  return ct.startsWith("image/");
}

function isPdf(ct: string) {
  return ct === "application/pdf";
}

function isText(ct: string) {
  return ct === "text/plain";
}

function isPreviewable(ct: string) {
  return isImage(ct) || isPdf(ct) || isText(ct);
}

export { isPreviewable };

export default function FilePreview({ file, onClose }: FilePreviewProps) {
  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name={isImage(file.contentType) ? "Image" : "FileText"} size={16} className="shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium truncate">{file.fileName}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatFileSize(file.fileSize)}
            </span>
          </div>
          <a href={file.cdnUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7">
              <Icon name="Download" size={12} />
              Скачать
            </Button>
          </a>
        </div>

        <div className="flex items-center justify-center bg-muted/10 overflow-auto" style={{ minHeight: 300, maxHeight: "calc(90vh - 60px)" }}>
          {isImage(file.contentType) && (
            <img
              src={file.cdnUrl}
              alt={file.fileName}
              className="max-w-full max-h-[calc(90vh-60px)] object-contain"
            />
          )}

          {isPdf(file.contentType) && (
            <iframe
              src={file.cdnUrl}
              title={file.fileName}
              className="w-full border-0"
              style={{ height: "calc(90vh - 60px)" }}
            />
          )}

          {isText(file.contentType) && (
            <iframe
              src={file.cdnUrl}
              title={file.fileName}
              className="w-full border-0 bg-white p-4 font-mono text-sm"
              style={{ height: "calc(90vh - 60px)" }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
