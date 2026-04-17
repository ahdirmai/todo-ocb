import { useRef, useState } from 'react';
import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import AvatarController from '@/actions/App/Http/Controllers/Settings/AvatarController';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import { Camera, Trash2 } from 'lucide-react';

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage().props;
    const user = auth.user as {
        name: string;
        email: string;
        email_verified_at: string | null;
        avatar_url?: string | null;
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const initials =
        user.name
            ?.split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() ?? '?';

    const currentAvatar = previewUrl ?? user.avatar_url ?? null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        // Show local preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
        reader.readAsDataURL(file);

        // Upload immediately
        setIsUploading(true);
        const formData = new FormData();
        formData.append('avatar', file);

        router.post(AvatarController.update.url(), formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                setIsUploading(false);
                setPreviewUrl(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    };

    const handleRemove = () => {
        router.delete(AvatarController.destroy.url(), {
            preserveScroll: true,
            onSuccess: () => setPreviewUrl(null),
        });
    };

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile information"
                    description="Update your name, email address, and profile photo"
                />

                {/* Avatar Uploader */}
                <div className="flex items-center gap-5">
                    <div className="group relative">
                        <Avatar className="h-20 w-20 ring-2 ring-border">
                            {currentAvatar ? (
                                <AvatarImage
                                    src={currentAvatar}
                                    alt={user.name}
                                    className="object-cover"
                                />
                            ) : null}
                            <AvatarFallback className="bg-muted text-2xl font-semibold text-muted-foreground select-none">
                                {initials}
                            </AvatarFallback>
                        </Avatar>

                        {/* Overlay on hover */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
                            aria-label="Change avatar"
                        >
                            <Camera className="h-6 w-6 text-white" />
                        </button>

                        {/* Uploading spinner */}
                        {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                                <svg
                                    className="h-5 w-5 animate-spin text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v8z"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isUploading}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera className="mr-1.5 h-3.5 w-3.5" />
                                {currentAvatar ? 'Ganti Foto' : 'Upload Foto'}
                            </Button>

                            {(currentAvatar || user.avatar_url) && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isUploading}
                                    onClick={handleRemove}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                    Hapus
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            JPG, PNG, GIF, atau WebP. Maks 2MB.
                        </p>
                    </div>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleFileSelect}
                        id="avatar-file-input"
                    />
                </div>

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>

                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>

                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Email address"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.email}
                                />
                            </div>

                            {mustVerifyEmail &&
                                user.email_verified_at === null && (
                                    <div>
                                        <p className="-mt-4 text-sm text-muted-foreground">
                                            Your email address is unverified.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                            >
                                                Click here to resend the
                                                verification email.
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <div className="mt-2 text-sm font-medium text-green-600">
                                                A new verification link has been
                                                sent to your email address.
                                            </div>
                                        )}
                                    </div>
                                )}

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
