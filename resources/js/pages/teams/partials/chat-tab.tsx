export function ChatTab({ team }: { team: any }) {
    return (
        <div className="flex h-full items-center justify-center text-muted-foreground border-2 border-dashed border-sidebar-border/70 rounded-xl">
            Chat Tab Content for {team.name}
        </div>
    );
}
