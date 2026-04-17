import { Head, Link, useForm, setLayoutProps } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, UploadCloud, X, Paperclip, Bold, Italic, Heading2, Heading3, List, ListOrdered, Save } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

export default function EditDocument({
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
            { title: `Edit: ${document.name}`, href: '#' },
        ],
    });

    const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        name: document.name,
        content: document.content || '',
        removed_media_ids: [] as number[],
        new_attachments: [] as File[],
    });

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Mulai menulis konten dokumen Anda di sini...',
            }),
        ],
        content: document.content || '',
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'tiptap min-h-[400px] px-1 py-2 text-[17px] leading-8 text-slate-700 dark:text-slate-300 focus:outline-none',
            },
        },
        onUpdate: ({ editor }) => {
            setData('content', editor.getHTML());
        },
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            // Cap to 5 combined attachments
            const existingCount = document.media?.length || 0;
            const removedCount = data.removed_media_ids.length;
            const currentTotal = existingCount - removedCount + data.new_attachments.length;

            if (currentTotal + files.length > 5) {
                alert('Maksimal 5 lampiran diperbolehkan untuk satu dokumen.');
                return;
            }
            setData('new_attachments', [...data.new_attachments, ...files]);
        }
    };

    const removeNewFile = (index: number) => {
        const newFiles = [...data.new_attachments];
        newFiles.splice(index, 1);
        setData('new_attachments', newFiles);
    };

    const markExistingMediaForRemoval = (mediaId: number) => {
        setData('removed_media_ids', [...data.removed_media_ids, mediaId]);
    };

    const unmarkExistingMediaForRemoval = (mediaId: number) => {
        setData('removed_media_ids', data.removed_media_ids.filter(id => id !== mediaId));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/teams/${team.slug}/documents/${document.id}`, {
            forceFormData: true,
        });
    };

    return (
        <>
            <Head title={`Edit ${document.name}`} />

            <div className="flex h-full flex-col space-y-6 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-6 dark:border-slate-800">
                    <Link
                        href={`/teams/${team.slug}/documents/${document.id}`}
                        className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-primary dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Batal
                    </Link>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={submit}
                            className="rounded-full px-6"
                            disabled={processing || !data.name || !data.content || data.content === '<p></p>'}
                        >
                            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Simpan Perubahan
                        </Button>
                    </div>
                </div>

                <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm sm:px-12 sm:pt-14 sm:pb-8 dark:border-zinc-800 dark:bg-zinc-950">
                    <div>
                        <Input
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Judul Dokumen..."
                            className="h-auto rounded-none border-0 bg-transparent px-0 text-4xl font-black tracking-tight shadow-none placeholder:text-slate-300 focus-visible:ring-0 sm:text-5xl md:text-6xl dark:placeholder:text-zinc-700/60"
                        />
                        {errors.name && <p className="mt-2 text-sm text-red-500">{errors.name}</p>}
                    </div>

                    <div className="min-h-[400px] mt-8">
                        {/* Custom Toolbar */}
                        {editor && (
                            <div className="sticky top-4 z-10 mb-6 flex w-fit flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/90 p-1 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90">
                                <Button
                                    type="button"
                                    variant={editor.isActive('bold') ? 'default' : 'ghost'}
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${editor.isActive('bold') ? '' : 'text-slate-600 dark:text-slate-400'}`}
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                >
                                    <Bold className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant={editor.isActive('italic') ? 'default' : 'ghost'}
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${editor.isActive('italic') ? '' : 'text-slate-600 dark:text-slate-400'}`}
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                >
                                    <Italic className="h-4 w-4" />
                                </Button>
                                <div className="mx-1 h-5 w-px bg-slate-300 dark:bg-zinc-700"></div>
                                <Button
                                    type="button"
                                    variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${editor.isActive('heading', { level: 2 }) ? '' : 'text-slate-600 dark:text-slate-400'}`}
                                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                >
                                    <Heading2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${editor.isActive('heading', { level: 3 }) ? '' : 'text-slate-600 dark:text-slate-400'}`}
                                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                                >
                                    <Heading3 className="h-4 w-4" />
                                </Button>
                                <div className="mx-1 h-5 w-px bg-slate-300 dark:bg-zinc-700"></div>
                                <Button
                                    type="button"
                                    variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${editor.isActive('bulletList') ? '' : 'text-slate-600 dark:text-slate-400'}`}
                                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${editor.isActive('orderedList') ? '' : 'text-slate-600 dark:text-slate-400'}`}
                                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                >
                                    <ListOrdered className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <EditorContent editor={editor} className="cursor-text" />
                        {errors.content && <p className="mt-2 text-sm text-red-500">{errors.content}</p>}
                    </div>

                    <div className="mt-10 border-t border-slate-100 pt-10 dark:border-zinc-800">
                        <Label className="mb-4 inline-block text-lg font-semibold">
                            Lampiran Berkas
                        </Label>
                        <div className="space-y-4">
                            {/* Upload New Files */}
                            <label className="group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 p-10 transition-all hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-400 shadow-sm transition-all group-hover:border-primary/20 group-hover:text-primary dark:border-zinc-800 dark:bg-zinc-900">
                                    <UploadCloud className="h-6 w-6" />
                                </div>
                                <div className="text-center">
                                    <span className="block font-semibold text-slate-700 transition-colors group-hover:text-primary dark:text-slate-200">
                                        Pilih file atau drag & drop ke sini untuk menambah lampiran baru
                                    </span>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    multiple
                                    onChange={handleFileSelect}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                                />
                            </label>

                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {/* Display Existing Media */}
                                {document.media?.map((media: any) => {
                                    const isRemoved = data.removed_media_ids.includes(media.id);
                                    return (
                                        <div
                                            key={`media-${media.id}`}
                                            className={`flex items-center justify-between rounded-xl border p-3 transition-opacity ${
                                                isRemoved 
                                                    ? 'border-red-200 bg-red-50 opacity-50 dark:border-red-900/30 dark:bg-red-950/20' 
                                                    : 'border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="shrink-0 rounded-lg border bg-white p-2 shadow-sm dark:bg-zinc-950">
                                                    <Paperclip className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <div className="truncate text-sm font-medium">
                                                    {media.file_name} {isRemoved && '(Akan Dihapus)'}
                                                </div>
                                            </div>
                                            {isRemoved ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => unmarkExistingMediaForRemoval(media.id)}
                                                    className="shrink-0 text-slate-500"
                                                >
                                                    Batal Hapus
                                                </Button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => markExistingMediaForRemoval(media.id)}
                                                    className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Display New Attachments */}
                                {data.new_attachments.map((file, idx) => (
                                    <div
                                        key={`new-${idx}`}
                                        className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-3 dark:border-primary/20"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="shrink-0 rounded-lg border bg-white p-2 shadow-sm dark:bg-zinc-950">
                                                <Paperclip className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="truncate text-sm font-medium">
                                                {file.name} (Baru)
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeNewFile(idx)}
                                            className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {errors.new_attachments && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.new_attachments}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
