import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { login } from '@/routes';

export default function Register() {
    useEffect(() => {
        router.visit(login(), { replace: true });
    }, []);

    return (
        <>
            <Head title="Register" />
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-sm text-muted-foreground">Redirecting...</p>
            </div>
        </>
    );
}

Register.layout = {
    title: 'Register',
    description: '',
};

