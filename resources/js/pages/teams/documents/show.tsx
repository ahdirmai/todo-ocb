import { Head, Link, useForm, setLayoutProps } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Paperclip, Download } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

export default function DocumentShow({
    team,
    document,
}: {
    team: any;
    document: any;
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: team.name, href: `/teams/${team.slug}` },
            { title: 'Dokumen', href: `/teams/${team.slug}/document` },
            { title: document.name, href: '#' },
        ],
    });

    const commentForm = useForm({
        content: '',
    });

    const handleComment = (e: React.FormEvent) => {
        e.preventDefault();
        commentForm.post(`/documents/${document.id}/comments`, {
            preserveScroll: true,
            onSuccess: () => commentForm.reset('content'),
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <>
            <Head title={document.name} />

            <div className="flex h-full flex-col overflow-y-auto pt-2">
                {/* Top bar */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 pb-5 dark:border-slate-800">
                    <Link
                        href={`/teams/${team.slug}/document${document.parent_id ? `?parent_id=${document.parent_id}` : ''}`}
                        className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-primary dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali
                    </Link>
                </div>

                {/* Content */}
                <div className="mx-auto w-full max-w-8xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
                    {/* Document Article */}
                    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="px-8 pt-12 pb-10 sm:px-12">
                            {/* Title */}
                            <h1 className="mb-8 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl dark:text-slate-50">
                                {document.name}
                            </h1>

                            {/* Author meta */}
                            <div className="mb-10 flex items-center gap-4 border-b border-slate-100 pb-8 dark:border-zinc-800">
                                <Avatar className="h-12 w-12 border-2 border-primary/10">
                                    <AvatarImage src={document.user?.avatar_url} />
                                    <AvatarFallback className="bg-primary/5 font-semibold text-primary">
                                        {document.user?.name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
                                        {document.user?.name}
                                    </p>
                                    <p className="mt-0.5 text-sm text-slate-500">
                                        Diterbitkan{' '}
                                        {new Date(document.created_at).toLocaleDateString('id-ID', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Content */}
                            <div
                                className="tiptap text-[17px] leading-8 text-slate-700 dark:text-slate-300"
                                dangerouslySetInnerHTML={{ __html: document.content }}
                            />

                            {/* Attachments */}
                            {document.media && document.media.length > 0 && (
                                <div className="mt-12 border-t border-slate-100 pt-8 dark:border-zinc-800">
                                    <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                                        Lampiran Tambahan
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {document.media.map((media: any) => (
                                            <a
                                                key={media.id}
                                                href={media.original_url}
                                                download
                                                target="_blank"
                                                rel="noreferrer"
                                                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5 dark:border-zinc-800 dark:bg-zinc-900/50"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="shrink-0 rounded-lg border bg-white p-2 shadow-sm dark:bg-zinc-950">
                                                        <Paperclip className="h-4 w-4 text-slate-400 transition-colors group-hover:text-primary" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                                            {media.file_name}
                                                        </div>
                                                        <div className="mt-0.5 text-xs text-slate-400">
                                                            {(media.size / 1024 / 1024).toFixed(2)} MB
                                                        </div>
                                                    </div>
                                                </div>
                                                <Download className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-primary" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Discussion Section */}
                    <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                        <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-slate-50">
                            Diskusi
                            <span className="rounded-full bg-primary/10 px-3 py-0.5 text-sm font-semibold text-primary">
                                {document.comments?.length || 0}
                            </span>
                        </h3>

                        {/* Comment form */}
                        <form onSubmit={handleComment} className="mb-8">
                            <Textarea
                                value={commentForm.data.content}
                                onChange={(e) => commentForm.setData('content', e.target.value)}
                                placeholder="Bagikan tanggapan atau pertanyaan Anda tentang dokumen ini..."
                                className="mb-3 min-h-[96px] resize-y rounded-2xl border-slate-200 bg-slate-50 p-4 text-[15px] focus-visible:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-900/50"
                                required
                            />
                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={commentForm.processing}
                                    className="rounded-full px-6"
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    Kirim Tanggapan
                                </Button>
                            </div>
                        </form>

                        {/* Comments list */}
                        {document.comments && document.comments.length > 0 ? (
                            <div className="space-y-5">
                                {document.comments.map((comment: any) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <Avatar className="h-9 w-9 shrink-0 border shadow-sm">
                                            <AvatarImage src={comment.user?.avatar_url} />
                                            <AvatarFallback className="text-xs">
                                                {comment.user?.name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="rounded-2xl border border-slate-100/60 bg-slate-50 px-5 py-4 dark:border-zinc-800/60 dark:bg-zinc-900/60">
                                                <div className="mb-2 flex items-center justify-between gap-4">
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        {comment.user?.name}
                                                    </span>
                                                    <span className="shrink-0 text-xs text-slate-400">
                                                        {formatDate(comment.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                                <p className="text-sm text-slate-500">
                                    Jadilah yang pertama untuk memulai diskusi!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
