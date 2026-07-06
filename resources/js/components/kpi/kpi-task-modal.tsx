import { router, usePage } from '@inertiajs/react';
import { Camera, Paperclip, CheckCircle2, Send, Download, Pencil, Trash2, X, Check, Upload } from 'lucide-react';
import { useState, useRef } from 'react';
import { CameraCapture } from '@/components/camera-capture';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PendingFilePreview } from '@/components/pending-file-preview';
import { toast } from 'sonner';

interface Media {
  id: number;
  name: string;
  original_url: string;
  mime_type: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  media: Media[];
}

interface KpiTask {
  id: string;
  title: string;
  category: string;
  task_name: string;
  weight: number;
  description: string;
  is_done: boolean;
  is_verified: boolean;
  comment_count: number;
  has_media: boolean;
  comments: Comment[];
  can_upload_proof?: boolean;
}

interface KpiTaskModalProps {
  task: KpiTask | null;
  area: 'hr' | 'operational' | 'gudang' | 'spv';
  onClose: () => void;
  readOnly?: boolean;
}

export function KpiTaskModal({ task, area, onClose, readOnly = false }: KpiTaskModalProps) {
  const { auth } = usePage().props as any;
  const currentUserId = auth?.user?.id;

  const [commentText, setCommentText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  if (!task) return null;

  const startEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const saveEdit = (commentId: string) => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    router.put(
      `/comments/${commentId}`,
      { content: editContent.trim() },
      {
        preserveScroll: true,
        onSuccess: () => {
          setSavingEdit(false);
          setEditingCommentId(null);
          setEditContent('');
          toast.success('Komentar diperbarui');
        },
        onError: () => {
          setSavingEdit(false);
          toast.error('Gagal memperbarui komentar');
        },
      },
    );
  };

  const deleteComment = (commentId: string) => {
    setDeletingCommentId(commentId);
    router.delete(
      `/comments/${commentId}`,
      {
        preserveScroll: true,
        onSuccess: () => {
          setDeletingCommentId(null);
          toast.success('Bukti dihapus');
        },
        onError: () => {
          setDeletingCommentId(null);
          toast.error('Gagal menghapus bukti');
        },
      },
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleSubmitComment = () => {
    if (!commentText.trim() && attachments.length === 0) {
      toast.error('Tambahkan komentar atau lampiran');
      return;
    }

    setSubmitting(true);
    router.post(
      `/tasks/${task.id}/comments`,
      {
        content: commentText || '-',
        attachments: attachments,
        attachment_dates: attachments.map(file => new Date(file.lastModified).toISOString()),
      },
      {
        forceFormData: true,
        preserveScroll: true,
        onSuccess: () => {
          setCommentText('');
          setAttachments([]);
          setSubmitting(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          toast.success('Bukti berhasil diunggah');

          // Auto-verify task after successful upload
          setTimeout(() => {
            router.post(`/${area}/kpi/tasks/${task.id}/verify`, {}, {
              preserveScroll: true,
              onSuccess: () => {
                toast.success('Task berhasil diverifikasi');
                onClose();
              },
            });
          }, 500);
        },
        onError: (errors: any) => {
          setSubmitting(false);
          if (errors.attachments) {
            toast.error(errors.attachments);
          } else if (errors.content) {
            toast.error(errors.content);
          } else {
            toast.error('Gagal mengunggah bukti, silakan coba lagi.');
          }
        },
      }
    );
  };

  return (
    <Dialog open={!!task} onOpenChange={onClose}>
      <DialogContent className="max-w-full sm:max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl">{task.task_name}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{task.category}</Badge>
                <Badge variant="outline">{task.weight}%</Badge>
                {task.is_verified && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Terverifikasi
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Description */}
          <div className="prose prose-sm max-w-none">
            <div
              className="space-y-4 text-sm leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-muted-foreground [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2"
              dangerouslySetInnerHTML={{ __html: task.description }}
            />
          </div>

          {/* Existing Evidence */}
          {task.comments && task.comments.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Bukti yang Telah Diunggah ({task.comments.length})</h3>
              <div className="space-y-4">
                {task.comments.map((comment) => {
                  const isOwner = comment.user && currentUserId && comment.user.id === currentUserId;
                  const isEditing = editingCommentId === comment.id;
                  const isDeleting = deletingCommentId === comment.id;

                  return (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{comment.user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {isOwner && !isEditing && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => startEdit(comment)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteComment(comment.id)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="resize-none text-sm"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(comment.id)}
                              disabled={savingEdit || !editContent.trim()}
                              className="h-7 text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Simpan
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                              disabled={savingEdit}
                              className="h-7 text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm">{comment.content}</p>
                      )}

                      {comment.media && comment.media.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {comment.media.map((media) => (
                            <div key={media.id} className="relative">
                              {media.mime_type.startsWith('image/') ? (
                                <a href={media.original_url} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={media.original_url}
                                    alt={media.name}
                                    className="h-24 w-24 object-cover rounded border hover:opacity-80 transition-opacity"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={media.original_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-background border rounded hover:bg-accent"
                                >
                                  <Paperclip className="h-4 w-4" />
                                  <span className="text-sm truncate max-w-[100px] sm:max-w-[150px]">{media.name}</span>
                                  <Download className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upload Evidence Section */}
          {!task.is_verified && !readOnly && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">
                {task.comments.length > 0 ? 'Upload Bukti Tambahan' : 'Upload Bukti Penyelesaian'}
              </h3>

            <div className="space-y-3">
              <Textarea
                placeholder="Catatan / keterangan bukti..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                className="resize-none"
              />

              <div className="flex flex-wrap items-center gap-2">
                <CameraCapture
                  onCapture={(files) => {
                    setAttachments(files);
                  }}
                  currentCount={attachments.length}
                  label="Ambil Foto"
                />

                {task.can_upload_proof && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      multiple={false}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload dari Galeri
                    </button>
                  </>
                )}
              </div>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {attachments.map((file, idx) => (
                    <PendingFilePreview
                      key={idx}
                      file={file}
                      onRemove={() => {
                        setAttachments(attachments.filter((_, i) => i !== idx));
                      }}
                    />
                  ))}
                </div>
              )}

              <Button
                onClick={handleSubmitComment}
                disabled={submitting || (!commentText.trim() && attachments.length === 0)}
                className="w-full"
              >
                {submitting ? (
                  <>Mengunggah & Memverifikasi...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Kirim Bukti & Selesaikan Task
                  </>
                )}
              </Button>
            </div>
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
