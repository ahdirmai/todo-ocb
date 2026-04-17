import React, {
    useEffect,
    useState,
    useRef,
    forwardRef,
    useImperativeHandle,
} from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Loader2, Send } from 'lucide-react';

const MentionList = forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command({ id: item.id, label: item.name });
        }
    };

    const upHandler = () => {
        setSelectedIndex(
            (selectedIndex + props.items.length - 1) % props.items.length,
        );
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: any) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }
            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }
            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }
            return false;
        },
    }));

    if (!props.items.length) {
        return null;
    }

    return (
        <div className="absolute z-50 min-w-[200px] overflow-hidden rounded-md border bg-white p-1 shadow-md dark:bg-zinc-800">
            {props.items.map((item: any, index: number) => (
                <button
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm ${
                        index === selectedIndex
                            ? 'bg-primary text-primary-foreground'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-zinc-700'
                    }`}
                    key={index}
                    onClick={() => selectItem(index)}
                >
                    {item.name}
                </button>
            ))}
        </div>
    );
});
MentionList.displayName = 'MentionList';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    disabled?: boolean;
    users?: any[]; // For mentions: {id, name}
    placeholder?: string;
    minHeight?: string;
}

export function RichTextEditor({
    content,
    onChange,
    disabled,
    users = [],
    placeholder = 'Tulis sesuatu...',
    minHeight = 'min-h-[60px]',
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Mention.configure({
                HTMLAttributes: {
                    class: 'text-primary font-medium bg-primary/10 rounded px-1',
                },
                suggestion: {
                    items: ({ query }) => {
                        return users
                            .filter((item) =>
                                item.name
                                    .toLowerCase()
                                    .includes(query.toLowerCase()),
                            )
                            .slice(0, 5);
                    },
                    render: () => {
                        // We use a simplified dom rendering since tippy is not installed.
                        let reactRenderer: any;
                        let popup: any;

                        return {
                            onStart: (props) => {
                                reactRenderer = new ReactRenderer(MentionList, {
                                    props,
                                    editor: props.editor,
                                });

                                popup = document.createElement('div');
                                popup.appendChild(reactRenderer.element);
                                document.body.appendChild(popup);

                                const { left, top, bottom } =
                                    props.clientRect();
                                popup.style.position = 'absolute';
                                popup.style.left = `${left}px`;
                                popup.style.top = `${bottom + window.scrollY}px`;
                                popup.style.zIndex = '9999';
                            },
                            onUpdate(props) {
                                reactRenderer.updateProps(props);
                                const { left, top, bottom } =
                                    props.clientRect();
                                if (popup) {
                                    popup.style.left = `${left}px`;
                                    popup.style.top = `${bottom + window.scrollY}px`;
                                }
                            },
                            onKeyDown(props) {
                                if (props.event.key === 'Escape') {
                                    if (popup) {
                                        popup.remove();
                                        popup = null;
                                    }
                                    return true;
                                }
                                return reactRenderer.ref?.onKeyDown(props);
                            },
                            onExit() {
                                if (popup) {
                                    popup.remove();
                                    popup = null;
                                }
                                reactRenderer.destroy();
                            },
                        };
                    },
                },
            }),
        ],
        content: content,
        editable: !disabled,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: `focus:outline-none ${minHeight} max-h-[300px] overflow-y-auto px-3 py-2 text-sm [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_strong]:font-bold [&_em]:italic [&_p]:m-0`,
                placeholder: placeholder,
            },
        },
    });

    useEffect(() => {
        if (editor && content === '' && editor.getHTML() !== '<p></p>') {
            editor.commands.setContent('');
        }
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div
            className={`relative overflow-hidden rounded-lg border border-input bg-background ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        >
            <div className="flex shrink-0 items-center gap-1 border-b border-input bg-muted/40 p-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-600"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                >
                    <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-600"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={
                        !editor.can().chain().focus().toggleItalic().run()
                    }
                >
                    <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-600"
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                >
                    <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-600"
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                >
                    <ListOrdered className="h-3.5 w-3.5" />
                </Button>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}
