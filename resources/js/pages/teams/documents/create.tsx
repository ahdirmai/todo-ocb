import { Head, Link, useForm, usePage, setLayoutProps } from '@inertiajs/react';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    ArrowLeft,
    Loader2,
    UploadCloud,
    X,
    Paperclip,
    Bold,
    Italic,
    Heading2,
    Heading3,
    List,
    ListOrdered,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PendingFilePreview } from '@/components/pending-file-preview';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store as storeDocument } from '@/routes/documents/document';

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CreateDocument({
    team,
    parentId,
}: {
    team: any;
    parentId: string | null;
}) {
    const { uploads } = usePage().props;
    const documentUploads = uploads.documents;
    const maxFileLabel = formatFileSize(documentUploads.maxFileKb * 1024);
    const acceptedFileTypes = documentUploads.allowedMimes
        .map((mime) => `.${mime}`)
        .join(',');

    setLayoutProps({
        breadcrumbs: [
            { title: team.name, href: `/teams/${team.slug}` },
            { title: 'Dokumen', href: `/teams/${team.slug}/document` },
            { title: 'Buat Dokumen', href: '#' },
        ],
    });

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        recipients: [] as number[],
        content: '',
        is_sop: false,
        parent_id: parentId,
        attachments: [] as File[],
    });

    const toggleRecipient = (userId: number) => {
        if (data.recipients.includes(userId)) {
            setData(
                'recipients',
                data.recipients.filter((id) => id !== userId),
            );
        } else {
            setData('recipients', [...data.recipients, userId]);
        }
    };

    const toggleSelectAll = () => {
        if (data.recipients.length === (team.users?.length || 0)) {
            setData('recipients', []);
        } else {
            setData('recipients', team.users?.map((u: any) => u.id) || []);
        }
    };

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Mulai menulis konten dokumen Anda di sini...',
            }),
        ],
        content: '',
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
            const invalidFiles = files.filter(
                (file) => file.size > documentUploads.maxFileKb * 1024,
            );

            if (invalidFiles.length > 0) {
                alert(
                    `Ukuran file melebihi batas ${maxFileLabel}: ${invalidFiles.map((file) => file.name).join(', ')}`,
                );
                e.target.value = '';

                return;
            }

            if (
                data.attachments.length + files.length >
                documentUploads.maxAttachments
            ) {
                alert(
                    `Maksimal ${documentUploads.maxAttachments} lampiran diperbolehkan.`,
                );

                return;
            }

            setData('attachments', [...data.attachments, ...files]);
        }
    };

    const removeFile = (index: number) => {
        const newFiles = [...data.attachments];
        newFiles.splice(index, 1);
        setData('attachments', newFiles);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(storeDocument.url(team), {
            forceFormData: true,
        });
    };

    return (
        <>
            <Head title="Buat Dokumen Baru" />

            <div className="flex h-full flex-col space-y-6 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-6 dark:border-slate-800">
                    <Link
                        href={`/teams/${team.slug}/document`}
                        className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-primary dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali
                    </Link>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() => window.history.back()}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={submit}
                            className="rounded-full px-6"
                            disabled={
                                processing ||
                                !data.name ||
                                !data.content ||
                                data.content === '<p></p>'
                            }
                        >
                            {processing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UploadCloud className="mr-2 h-4 w-4" />
                            )}
                            Terbitkan Dokumen
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
                        {errors.name && (
                            <p className="mt-2 text-sm text-red-500">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 py-4">
                        <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                            <input
                                type="checkbox"
                                checked={data.is_sop}
                                onChange={(e) =>
                                    setData('is_sop', e.target.checked)
                                }
                                className="mt-1 h-4 w-4 rounded border-amber-300 text-primary focus:ring-primary"
                            />
                            <span>
                                <span className="block font-semibold">
                                    Tandai sebagai SOP
                                </span>
                                <span className="mt-1 block text-xs text-amber-700 dark:text-amber-200/80">
                                    Gunakan ini jika dokumen berisi standar
                                    kerja atau prosedur yang akan dipakai untuk
                                    audit progres task.
                                </span>
                            </span>
                        </label>

                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Penerima:
                            </Label>
                            <button
                                type="button"
                                onClick={toggleSelectAll}
                                className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
                            >
                                {data.recipients.length ===
                                    (team.users?.length || 0) &&
                                data.recipients.length > 0
                                    ? 'Batal Pilih Semua'
                                    : 'Pilih Semua'}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {team.users?.map((user: any) => {
                                const isSelected = data.recipients.includes(
                                    user.id,
                                );

                                return (
                                    <button
                                        type="button"
                                        key={user.id}
                                        onClick={() => toggleRecipient(user.id)}
                                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all focus:outline-none ${
                                            isSelected
                                                ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-slate-400 dark:hover:bg-zinc-900'
                                        }`}
                                    >
                                        <Avatar className="h-5 w-5">
                                            <AvatarImage
                                                src={
                                                    user.avatar_url ?? undefined
                                                }
                                            />
                                            <AvatarFallback className="text-[10px]">
                                                {user.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">
                                            {user.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="min-h-[400px]">
                        {/* Custom Toolbar */}
                        {editor && (
                            <div className="sticky top-4 z-10 mb-6 flex w-fit flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/90 p-1 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90">
                                <Button
                                    type="button"
                                    variant={
                                        editor.isActive('bold')
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${editor.isActive('bold') ? '' : 'text-slate-600 dark:text-slate-400'}`}
                                    onClick={() =>
                                        editor
                                            .chain()
                                            .focus()
                                            .toggleBold()
                                            .run()
                                    }
                                >
                                    <Bold className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant={
                                        editor.isActive('italic')
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${editor.isActive('italic') ? '' : 'text-slate-600 dark:text-slate-400'}`}
                                    onClick={() =>
                                        editor
                                            .chain()
                                            .focus()
                                            .toggleItalic()
                                            .run()
                                    }
                                >
                                    <Italic className="h-4 w-4" />
                                </Button>
                                <div className="mx-1 h-5 w-px bg-slate-300 dark:bg-zinc-700"></div>
                                <Button
                                    type="button"
                                    variant={
                                        editor.isActive('heading', { level: 2 })
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${editor.isActive('heading', { level: 2 }) ? '' : 'text-slate-600 dark:text-slate-400'}`}
                                    onClick={() =>
                                        editor
                                            .chain()
                                            .focus()
                                            .toggleHeading({ level: 2 })
                                            .run()
                                    }
                                >
                                    <Heading2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant={
                                        editor.isActive('heading', { level: 3 })
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${editor.isActive('heading', { level: 3 }) ? '' : 'text-slate-600 dark:text-slate-400'}`}
                                    onClick={() =>
                                        editor
                                            .chain()
                                            .focus()
                                            .toggleHeading({ level: 3 })
                                            .run()
                                    }
                                >
                                    <Heading3 className="h-4 w-4" />
                                </Button>
                                <div className="mx-1 h-5 w-px bg-slate-300 dark:bg-zinc-700"></div>
                                <Button
                                    type="button"
                                    variant={
                                        editor.isActive('bulletList')
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${editor.isActive('bulletList') ? '' : 'text-slate-600 dark:text-slate-400'}`}
                                    onClick={() =>
                                        editor
                                            .chain()
                                            .focus()
                                            .toggleBulletList()
                                            .run()
                                    }
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant={
                                        editor.isActive('orderedList')
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${editor.isActive('orderedList') ? '' : 'text-slate-600 dark:text-slate-400'}`}
                                    onClick={() =>
                                        editor
                                            .chain()
                                            .focus()
                                            .toggleOrderedList()
                                            .run()
                                    }
                                >
                                    <ListOrdered className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <EditorContent
                            editor={editor}
                            className="cursor-text"
                        />
                        {errors.content && (
                            <p className="mt-2 text-sm text-red-500">
                                {errors.content}
                            </p>
                        )}
                    </div>

                    <div className="mt-10 border-t border-slate-100 pt-10 dark:border-zinc-800">
                        <Label className="mb-4 inline-block text-lg font-semibold">
                            Lampiran Berkas (Opsional)
                        </Label>
                        <div className="space-y-4">
                            <label className="group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 p-10 transition-all hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-400 shadow-sm transition-all group-hover:border-primary/20 group-hover:text-primary dark:border-zinc-800 dark:bg-zinc-900">
                                    <UploadCloud className="h-6 w-6" />
                                </div>
                                <div className="text-center">
                                    <span className="block font-semibold text-slate-700 transition-colors group-hover:text-primary dark:text-slate-200">
                                        Pilih file atau drag & drop ke sini
                                    </span>
                                    <span className="mt-1 block text-sm text-slate-500">
                                        Tepat untuk lampiran referensi (PDF,
                                        Excel, Gambar) Maks. {maxFileLabel} per
                                        file, hingga{' '}
                                        {documentUploads.maxAttachments}{' '}
                                        lampiran
                                    </span>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    multiple
                                    onChange={handleFileSelect}
                                    accept={acceptedFileTypes}
                                />
                            </label>

                            {data.attachments.length > 0 && (
                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {data.attachments.map((file, idx) => (
                                        <PendingFilePreview
                                            key={idx}
                                            file={file}
                                            onRemove={() => removeFile(idx)}
                                        />
                                    ))}
                                </div>
                            )}
                            {errors.attachments && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.attachments}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
