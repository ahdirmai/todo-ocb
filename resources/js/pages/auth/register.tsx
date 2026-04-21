import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { login } from '@/routes';

export default function Register() {
    useEffect(() => {
        router.visit(login(), { replace: true });
    }, []);

    return (
        <>
            <Head title="Register" />
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-sm text-muted-foreground">Redirecting...</p>
            </div>
        </>
    );
}

Register.layout = {
    title: 'Register',
    description: '',
};
