import { useState, useEffect, useCallback } from 'react';
import { useForm, router, Link, usePage } from '@inertiajs/react';
import {
    Folder,
    FileText,
    File as FileIcon,
    Upload,
    FolderPlus,
    MoreHorizontal,
    FileDown,
    Trash,
    Pencil,
    ChevronRight,
    FilePlus,
    FileSpreadsheet,
    FileType,
    Image,
    Loader2,
    UploadCloud,
    ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    create as createDocument,
    destroy as destroyDocument,
    edit as editDocument,
    index as documentsIndex,
    show as showDocument,
    update as updateDocument,
    updateFile,
} from '@/routes/documents';
import { store as storeFile } from '@/routes/documents/file';
import { store as storeFolder } from '@/routes/documents/folder';

type DocType = 'folder' | 'document' | 'file';

interface DocItem {
    id: string;
    name: string;
    type: DocType;
    is_sop: boolean;
    user_id: number;
    user?: { name: string; avatar_url?: string | null };
    media?: { original_url: string; size: number }[];
    updated_at?: string;
}

function FileIcon2({ type, name }: { type: DocType; name: string }) {
    if (type === 'folder') {
        return (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/10">
                <Folder className="h-5 w-5 fill-amber-400/30" />
            </div>
        );
    }
    if (type === 'document') {
        return (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-500/10">
                <FileText className="h-5 w-5" />
            </div>
        );
    }
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'pdf') {
        return (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-500/10">
                <FileType className="h-5 w-5" />
            </div>
        );
    }
    if (['xls', 'xlsx'].includes(ext)) {
        return (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-500/10">
                <FileSpreadsheet className="h-5 w-5" />
            </div>
        );
    }
    if (['doc', 'docx'].includes(ext)) {
        return (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500 dark:bg-sky-500/10">
                <FileText className="h-5 w-5" />
            </div>
        );
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        return (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-500 dark:bg-purple-500/10">
                <Image className="h-5 w-5" />
            </div>
        );
    }
    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <FileIcon className="h-5 w-5" />
        </div>
    );
}

function TypeBadge({ type }: { type: DocType }) {
    if (type === 'folder') {
        return (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Folder
            </span>
        );
    }
    if (type === 'document') {
        return (
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                Dokumen
            </span>
        );
    }
    return <span className="text-xs font-medium text-slate-400">File</span>;
}

function SopBadge() {
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            <ShieldCheck className="h-3 w-3" />
            SOP
        </span>
    );
}

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
}

function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function DokumenTab({ team }: { team: any }) {
    const { auth } = usePage<{
        auth: { user: { id: number }; roles: string[] };
    }>().props;
    const currentUserId = auth?.user?.id;
    const isAdmin = auth?.roles?.some((r) =>
        ['superadmin', 'admin'].includes(r),
    );

    const [documents, setDocuments] = useState<DocItem[]>([]);
    const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
    const [currentParentId, setCurrentParentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isFileModalOpen, setIsFileModalOpen] = useState(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isUpdateFileModalOpen, setIsUpdateFileModalOpen] = useState(false);

    const folderForm = useForm({ name: '', parent_id: null as string | null });
    const fileForm = useForm({
        file: null as File | null,
        parent_id: null as string | null,
        is_sop: false,
    });
    const renameForm = useForm({ id: '', name: '' });
    const updateFileForm = useForm({
        id: '',
        file: null as File | null,
        is_sop: false,
    });

    const fetchDocuments = useCallback(
        async (parentId: string | null = null) => {
            setIsLoading(true);
            try {
                const response = await fetch(
                    documentsIndex.url(team, {
                        query: parentId ? { parent_id: parentId } : {},
                    }),
                    { headers: { Accept: 'application/json' } },
                );
                if (response.ok) {
                    const res = await response.json();
                    setDocuments(res.documents);
                    setBreadcrumbs(res.breadcrumbs);
                    setCurrentParentId(parentId);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        },
        [team.slug],
    );

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const parentId = params.get('parent_id');
        fetchDocuments(parentId);
    }, [fetchDocuments]);

    const handleCreateFolder = (e: React.FormEvent) => {
        e.preventDefault();
        folderForm.post(storeFolder.url(team), {
            onSuccess: () => {
                setIsFolderModalOpen(false);
                folderForm.reset('name');
                fetchDocuments(currentParentId);
            },
        });
    };

    const handleUploadFile = (e: React.FormEvent) => {
        e.preventDefault();
        fileForm.post(storeFile.url(team), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setIsFileModalOpen(false);
                fileForm.reset('file', 'is_sop');
                fetchDocuments(currentParentId);
            },
        });
    };

    const handleDelete = (docId: string) => {
        if (confirm('Yakin ingin menghapus item ini?')) {
            router.delete(destroyDocument.url({ team, document: docId }), {
                preserveScroll: true,
                onSuccess: () => fetchDocuments(currentParentId),
            });
        }
    };

    const handleUpdateFile = (e: React.FormEvent) => {
        e.preventDefault();
        updateFileForm.post(
            updateFile.url({ team, document: updateFileForm.data.id }),
            {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    setIsUpdateFileModalOpen(false);
                    updateFileForm.reset('file', 'id', 'is_sop');
                    fetchDocuments(currentParentId);
                },
            },
        );
    };

    // Separate folders first, then documents, then files
    const sorted = [
        ...documents.filter((d) => d.type === 'folder'),
        ...documents.filter((d) => d.type === 'document'),
        ...documents.filter((d) => d.type === 'file'),
    ];

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                {/* Breadcrumb */}
                <nav className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto text-sm">
                    <button
                        onClick={() => fetchDocuments(null)}
                        className="shrink-0 font-semibold text-slate-500 transition-colors hover:text-primary dark:text-slate-400"
                    >
                        {team.name}
                    </button>
                    {breadcrumbs.map((crumb) => (
                        <div
                            key={crumb.id}
                            className="flex shrink-0 items-center gap-1 text-slate-400"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                            <button
                                onClick={() => fetchDocuments(crumb.id)}
                                className="font-medium text-slate-700 transition-colors hover:text-primary dark:text-slate-300"
                            >
                                {crumb.name}
                            </button>
                        </div>
                    ))}
                </nav>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            folderForm.setData('parent_id', currentParentId);
                            setIsFolderModalOpen(true);
                        }}
                        className="h-9 rounded-lg px-3 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800"
                    >
                        <FolderPlus className="mr-1.5 h-4 w-4" />
                        <span className="hidden sm:inline">Folder</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-9 rounded-lg px-3 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800"
                    >
                        <Link
                            href={createDocument.url(
                                team,
                                currentParentId
                                    ? { query: { parent_id: currentParentId } }
                                    : undefined,
                            )}
                        >
                            <FilePlus className="mr-1.5 h-4 w-4" />
                            <span className="hidden sm:inline">Dokumen</span>
                        </Link>
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            fileForm.setData('parent_id', currentParentId);
                            setIsFileModalOpen(true);
                        }}
                        className="h-9 rounded-lg px-4"
                    >
                        <Upload className="mr-1.5 h-4 w-4" />
                        Upload
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col gap-2 p-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="flex animate-pulse items-center gap-4 rounded-xl p-4"
                            >
                                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-zinc-800" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 w-48 rounded-full bg-slate-100 dark:bg-zinc-800" />
                                    <div className="h-3 w-24 rounded-full bg-slate-100 dark:bg-zinc-800" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : sorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                            <Folder className="h-9 w-9 text-slate-300 dark:text-zinc-600" />
                        </div>
                        <h3 className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-200">
                            Belum ada konten
                        </h3>
                        <p className="max-w-xs text-sm text-slate-400">
                            Mulai dengan membuat folder, menulis dokumen, atau
                            mengunggah file.
                        </p>
                        <div className="mt-6 flex gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    folderForm.setData(
                                        'parent_id',
                                        currentParentId,
                                    );
                                    setIsFolderModalOpen(true);
                                }}
                            >
                                <FolderPlus className="mr-1.5 h-4 w-4" /> Buat
                                Folder
                            </Button>
                            <Button size="sm" asChild>
                                <Link href={createDocument.url(team)}>
                                    <FilePlus className="mr-1.5 h-4 w-4" /> Buat
                                    Dokumen
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4">
                        {/* List header */}
                        <div className="mb-1 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2 text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                            <span>Nama</span>
                            <span className="hidden w-24 text-right sm:block">
                                Tipe
                            </span>
                            <span className="hidden w-24 text-right md:block">
                                Diperbarui
                            </span>
                            <span className="w-8" />
                        </div>

                        <div className="space-y-0.5">
                            {sorted.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="group relative grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                                >
                                    {/* Name col */}
                                    <div className="flex min-w-0 items-center gap-3">
                                        <FileIcon2
                                            type={doc.type}
                                            name={doc.name}
                                        />
                                        <div className="min-w-0">
                                            {doc.type === 'folder' ? (
                                                <button
                                                    onClick={() =>
                                                        fetchDocuments(doc.id)
                                                    }
                                                    className="block truncate text-left text-sm font-semibold text-slate-800 transition-colors hover:text-primary focus:outline-none dark:text-slate-100"
                                                >
                                                    {doc.name}
                                                </button>
                                            ) : doc.type === 'file' ? (
                                                <a
                                                    href={
                                                        doc.media?.[0]
                                                            ?.original_url
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block truncate text-sm font-semibold text-slate-800 transition-colors hover:text-primary dark:text-slate-100"
                                                >
                                                    {doc.name}
                                                </a>
                                            ) : (
                                                <Link
                                                    href={showDocument.url({
                                                        team,
                                                        document: doc,
                                                    })}
                                                    className="block truncate text-sm font-semibold text-slate-800 transition-colors hover:text-primary dark:text-slate-100"
                                                >
                                                    {doc.name}
                                                </Link>
                                            )}
                                            <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400">
                                                {doc.user && (
                                                    <Avatar className="h-4 w-4">
                                                        <AvatarImage
                                                            src={
                                                                doc.user
                                                                    .avatar_url ??
                                                                undefined
                                                            }
                                                        />
                                                        <AvatarFallback className="text-[8px]">
                                                            {doc.user.name.charAt(
                                                                0,
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <span>
                                                    {doc.user?.name}
                                                    {doc.type === 'file' &&
                                                        doc.media?.[0] && (
                                                            <>
                                                                {' '}
                                                                ·{' '}
                                                                {formatSize(
                                                                    doc.media[0]
                                                                        .size,
                                                                )}
                                                            </>
                                                        )}
                                                </span>
                                                {doc.is_sop && <SopBadge />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Type col */}
                                    <div className="hidden w-24 text-right sm:block">
                                        <TypeBadge type={doc.type} />
                                    </div>

                                    {/* Date col */}
                                    <div className="hidden w-24 text-right text-xs text-slate-400 md:block">
                                        {formatDate(doc.updated_at)}
                                    </div>

                                    {/* Actions col */}
                                    <div className="w-8">
                                        {(doc.user_id === currentUserId ||
                                            isAdmin) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="w-44 rounded-xl"
                                                >
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            renameForm.setData({
                                                                id: doc.id,
                                                                name: doc.name,
                                                            });
                                                            setIsRenameModalOpen(
                                                                true,
                                                            );
                                                        }}
                                                        className="cursor-pointer"
                                                    >
                                                        <Pencil className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                                        Ganti Nama
                                                    </DropdownMenuItem>
                                                    {doc.type ===
                                                        'document' && (
                                                        <DropdownMenuItem
                                                            asChild
                                                            className="cursor-pointer"
                                                        >
                                                            <Link
                                                                href={editDocument.url(
                                                                    {
                                                                        team,
                                                                        document:
                                                                            doc,
                                                                    },
                                                                )}
                                                            >
                                                                <FileText className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                                                Ubah Dokumen
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {doc.type === 'file' && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    updateFileForm.setData(
                                                                        {
                                                                            id: doc.id,
                                                                            file: null,
                                                                            is_sop: Boolean(
                                                                                doc.is_sop,
                                                                            ),
                                                                        },
                                                                    );
                                                                    setIsUpdateFileModalOpen(
                                                                        true,
                                                                    );
                                                                }}
                                                                className="cursor-pointer"
                                                            >
                                                                <UploadCloud className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                                                Perbarui Versi
                                                                File
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                asChild
                                                                className="cursor-pointer"
                                                            >
                                                                <a
                                                                    href={
                                                                        doc
                                                                            .media?.[0]
                                                                            ?.original_url
                                                                    }
                                                                    download
                                                                >
                                                                    <FileDown className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                                                    Unduh File
                                                                    Terkini
                                                                </a>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleDelete(doc.id)
                                                        }
                                                        className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/30"
                                                    >
                                                        <Trash className="mr-2 h-3.5 w-3.5" />
                                                        Hapus
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <Dialog
                open={isFolderModalOpen}
                onOpenChange={setIsFolderModalOpen}
            >
                <DialogContent className="rounded-2xl">
                    <form onSubmit={handleCreateFolder}>
                        <DialogHeader>
                            <DialogTitle>Buat Folder Baru</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="folder_name">Nama Folder</Label>
                            <Input
                                id="folder_name"
                                value={folderForm.data.name}
                                onChange={(e) =>
                                    folderForm.setData('name', e.target.value)
                                }
                                required
                                autoFocus
                                autoComplete="off"
                                className="mt-2"
                                placeholder="Cth: Laporan Keuangan"
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsFolderModalOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={folderForm.processing}
                            >
                                Buat
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
                <DialogContent className="rounded-2xl">
                    <form onSubmit={handleUploadFile}>
                        <DialogHeader>
                            <DialogTitle>Upload File</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="file_upload">Pilih File</Label>
                            <Input
                                id="file_upload"
                                type="file"
                                onChange={(e) =>
                                    fileForm.setData(
                                        'file',
                                        e.target.files?.[0] || null,
                                    )
                                }
                                required
                                className="mt-2"
                            />
                            <p className="mt-2 text-xs text-muted-foreground">
                                Maks 10MB. Format: pdf, doc, docx, xls, xlsx,
                                png, jpg, jpeg.
                            </p>
                            <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                                <input
                                    type="checkbox"
                                    checked={fileForm.data.is_sop}
                                    onChange={(e) =>
                                        fileForm.setData(
                                            'is_sop',
                                            e.target.checked,
                                        )
                                    }
                                    className="mt-1 h-4 w-4 rounded border-amber-300 text-primary focus:ring-primary"
                                />
                                <span>
                                    <span className="block font-semibold">
                                        Tandai sebagai SOP
                                    </span>
                                    <span className="mt-1 block text-xs text-amber-700 dark:text-amber-200/80">
                                        File SOP akan tersedia sebagai referensi
                                        audit progres task.
                                    </span>
                                </span>
                            </label>
                            {fileForm.errors.is_sop && (
                                <p className="mt-2 text-xs text-red-500">
                                    {fileForm.errors.is_sop}
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsFileModalOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={fileForm.processing}
                            >
                                Upload
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isRenameModalOpen}
                onOpenChange={setIsRenameModalOpen}
            >
                <DialogContent className="rounded-2xl">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            renameForm.put(
                                updateDocument.url({
                                    team,
                                    document: renameForm.data.id,
                                }),
                                {
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        setIsRenameModalOpen(false);
                                        fetchDocuments(currentParentId);
                                    },
                                },
                            );
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>Ganti Nama</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="rename_name">Nama Baru</Label>
                            <Input
                                id="rename_name"
                                value={renameForm.data.name}
                                onChange={(e) =>
                                    renameForm.setData('name', e.target.value)
                                }
                                required
                                autoFocus
                                autoComplete="off"
                                className="mt-2"
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsRenameModalOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={renameForm.processing}
                            >
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isUpdateFileModalOpen}
                onOpenChange={setIsUpdateFileModalOpen}
            >
                <DialogContent className="rounded-2xl">
                    <form onSubmit={handleUpdateFile}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <UploadCloud className="h-5 w-5 text-primary" />
                                Perbarui Versi File
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="mb-4 text-sm text-slate-500">
                                Unggah file pengganti. File lama akan tetap
                                tersimpan sebagai riwayat (History).
                            </p>
                            <Label htmlFor="update_file_upload">
                                Pilih File Baru
                            </Label>
                            <Input
                                id="update_file_upload"
                                type="file"
                                onChange={(e) =>
                                    updateFileForm.setData(
                                        'file',
                                        e.target.files?.[0] || null,
                                    )
                                }
                                required
                                className="mt-2"
                            />
                            <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                                <input
                                    type="checkbox"
                                    checked={updateFileForm.data.is_sop}
                                    onChange={(e) =>
                                        updateFileForm.setData(
                                            'is_sop',
                                            e.target.checked,
                                        )
                                    }
                                    className="mt-1 h-4 w-4 rounded border-amber-300 text-primary focus:ring-primary"
                                />
                                <span>
                                    <span className="block font-semibold">
                                        Tandai sebagai SOP
                                    </span>
                                    <span className="mt-1 block text-xs text-amber-700 dark:text-amber-200/80">
                                        Pertahankan atau ubah status SOP saat
                                        mengunggah versi baru.
                                    </span>
                                </span>
                            </label>
                            {updateFileForm.errors.file && (
                                <p className="mt-2 text-xs text-red-500">
                                    {updateFileForm.errors.file}
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsUpdateFileModalOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateFileForm.processing}
                            >
                                {updateFileForm.processing && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Unggah
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
