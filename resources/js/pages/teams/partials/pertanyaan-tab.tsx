export function PertanyaanTab({ team }: { team: any }) {
    return (
        <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-sidebar-border/70 text-muted-foreground">
            Pertanyaan Tab Content for {team.name}
        </div>
    );
}
