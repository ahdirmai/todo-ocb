import { router, usePage } from '@inertiajs/react';
import { Paperclip, CheckCircle2, Send, Download, Pencil, Trash2, X, Check, Upload, Video, ImageIcon, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
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
  require_video_upload?: boolean;
  minimum_photos?: number;
  ai_check_status?: 'pending' | 'passed' | 'failed' | 'exhausted' | null;
  ai_compliance_score?: number | string | null;
  ai_check_attempts?: number;
  ai_check_feedback?: string | null;
  ai_max_attempts?: number;
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

  // Poll while the AI compliance check runs so the result appears without a
  // manual refresh. Reloads only the KPI dashboard task props.
  const aiPending = task?.ai_check_status === 'pending';
  useEffect(() => {
    if (!aiPending) {
      return;
    }

    const interval = setInterval(() => {
      router.reload({ only: ['dateTasks', 'spvKanbanTasks', 'todayTasks'] });
    }, 3000);

    return () => clearInterval(interval);
  }, [aiPending]);

  if (!task) return null;

  const requiresVideo = task.require_video_upload === true;
  const hasExistingVideo = task.comments.some((c) =>
    c.media?.some((m) => m.mime_type.startsWith('video/')),
  );
  const hasPendingVideo = attachments.some((f) => f.type.startsWith('video/'));
  const videoRequirementMet = !requiresVideo || hasExistingVideo || hasPendingVideo;

  // Minimum photos are counted within a SINGLE comment: either an existing
  // comment already meets it, or the current pending upload (one new comment)
  // carries enough photos.
  const minimumPhotos = task.minimum_photos ?? 0;
  const maxPhotosInAnyComment = task.comments.reduce(
    (max, c) => Math.max(max, c.media?.filter((m) => m.mime_type.startsWith('image/')).length ?? 0),
    0,
  );
  const pendingPhotoCount = attachments.filter((f) => f.type.startsWith('image/')).length;
  const photoRequirementMet =
    minimumPhotos <= 0 ||
    maxPhotosInAnyComment >= minimumPhotos ||
    pendingPhotoCount >= minimumPhotos;

  const aiStatus = task.ai_check_status ?? null;
  const aiScore = task.ai_compliance_score != null ? Number(task.ai_compliance_score) : null;
  const aiAttempts = task.ai_check_attempts ?? 0;
  const aiMaxAttempts = task.ai_max_attempts ?? 3;
  const aiRemaining = Math.max(0, aiMaxAttempts - aiAttempts);
  // Upload / submit is locked while a check runs, once passed, or once the AI
  // attempts are exhausted.
  const aiLocked = aiStatus === 'pending' || aiStatus === 'passed' || aiStatus === 'exhausted';

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
      const picked = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...picked]);
    }
  };

  const handleSubmitComment = () => {
    if (!commentText.trim() && attachments.length === 0) {
      toast.error('Tambahkan komentar atau lampiran');
      return;
    }

    if (!videoRequirementMet) {
      toast.error('Task ini wajib melampirkan video bukti sebelum diselesaikan.');
      return;
    }

    if (!photoRequirementMet) {
      toast.error(`Task ini wajib minimal ${minimumPhotos} foto dalam satu komentar bukti.`);
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

          {/* AI Check Status */}
          {aiStatus && (
            <div className="border-t pt-6">
              {aiStatus === 'pending' && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                  <span>AI sedang mengecek kesesuaian bukti dengan cara kerja task…</span>
                </div>
              )}
              {aiStatus === 'passed' && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm dark:border-green-900 dark:bg-green-950/40">
                  <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-300">
                    <Sparkles className="h-4 w-4" /> Lulus cek AI ({aiScore != null ? aiScore.toFixed(0) : '-'}%)
                  </div>
                  {task.ai_check_feedback && (
                    <p className="mt-1 text-xs text-green-700/80 dark:text-green-300/80">{task.ai_check_feedback}</p>
                  )}
                </div>
              )}
              {aiStatus === 'failed' && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-900 dark:bg-red-950/40">
                  <div className="flex items-center gap-2 font-medium text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-4 w-4" /> Belum sesuai ({aiScore != null ? aiScore.toFixed(0) : '-'}%) — sisa {aiRemaining}× percobaan
                  </div>
                  <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
                    <span className="font-medium">Alasan: </span>
                    {task.ai_check_feedback || 'Bukti belum sesuai dengan cara kerja & cara verifikasi task.'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Perbaiki bukti lalu submit ulang.</p>
                </div>
              )}
              {aiStatus === 'exhausted' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                  <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" /> Jatah cek AI habis — skor parsial {aiScore != null ? aiScore.toFixed(0) : '-'}%
                  </div>
                  <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
                    <span className="font-medium">Alasan: </span>
                    {task.ai_check_feedback || 'Bukti belum sesuai dengan cara kerja & cara verifikasi task.'}
                  </p>
                </div>
              )}
            </div>
          )}

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
                              ) : media.mime_type.startsWith('video/') ? (
                                <video
                                  src={media.original_url}
                                  controls
                                  playsInline
                                  className="h-24 w-40 rounded border bg-black object-contain"
                                />
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

          {/* Upload Evidence Section — always visible for editing, even after verification */}
          {!readOnly && !aiLocked && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">
                {task.comments.length > 0 ? 'Upload Bukti Tambahan' : 'Upload Bukti Penyelesaian'}
              </h3>

            <div className="space-y-3">
              {requiresVideo && !videoRequirementMet && (
                <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                  <Video className="h-4 w-4 shrink-0" />
                  <span>Task ini wajib melampirkan video bukti (rekam kamera atau upload galeri) sebelum bisa diselesaikan.</span>
                </div>
              )}

              {minimumPhotos > 0 && !photoRequirementMet && (
                <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                  <ImageIcon className="h-4 w-4 shrink-0" />
                  <span>
                    Wajib minimal {minimumPhotos} foto dalam satu komentar bukti
                    (sekarang {pendingPhotoCount} foto dipilih).
                  </span>
                </div>
              )}

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
                    setAttachments((prev) => [...prev, ...files]);
                  }}
                  currentCount={attachments.length}
                  maxPhotos={Math.max(5, minimumPhotos)}
                  label="Ambil Foto"
                  allowVideo={requiresVideo}
                />

                {(task.can_upload_proof || requiresVideo) && (
                  <>
                    <input
                      type="file"
                      accept="image/*,video/*"
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
                      Upload dari Galeri (Foto/Video)
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
                disabled={
                  submitting ||
                  (!commentText.trim() && attachments.length === 0) ||
                  !videoRequirementMet ||
                  !photoRequirementMet
                }
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
