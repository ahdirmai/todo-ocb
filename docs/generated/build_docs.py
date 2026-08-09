#!/usr/bin/env python3
"""Convert the project docs (Markdown) into styled, self-contained HTML.

Mermaid ```mermaid fenced blocks are converted to <pre class="mermaid"> and
rendered client-side via the Mermaid CDN. Everything else uses python-markdown
with tables, fenced code, TOC and Pygments highlighting.
"""
import re
import sys
import markdown
from pygments.formatters import HtmlFormatter

PYGMENTS_CSS = HtmlFormatter(style="default").get_style_defs(".codehilite")

CSS = """
:root{--fg:#1f2933;--muted:#616e7c;--accent:#2563eb;--accent-soft:#eff4ff;
--border:#e4e7eb;--code-bg:#f5f7fa;--table-head:#f0f4f8;}
*{box-sizing:border-box;}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
color:var(--fg);line-height:1.65;max-width:900px;margin:0 auto;padding:48px 40px 80px;
font-size:15px;background:#fff;}
h1,h2,h3,h4{line-height:1.25;font-weight:700;margin-top:1.8em;margin-bottom:.6em;}
h1{font-size:2.1em;border-bottom:3px solid var(--accent);padding-bottom:.3em;margin-top:.2em;}
h2{font-size:1.5em;border-bottom:1px solid var(--border);padding-bottom:.25em;color:#111;}
h3{font-size:1.2em;color:#243b53;}
h4{font-size:1.02em;color:#334e68;}
a{color:var(--accent);text-decoration:none;}
a:hover{text-decoration:underline;}
p,ul,ol{margin:.6em 0;}
code{font-family:"SF Mono",SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;
font-size:.86em;background:var(--code-bg);padding:.15em .4em;border-radius:4px;}
pre{background:var(--code-bg);border:1px solid var(--border);border-radius:8px;padding:14px 16px;
overflow:auto;font-size:.82em;line-height:1.5;}
pre code{background:none;padding:0;}
blockquote{border-left:4px solid var(--accent);background:var(--accent-soft);margin:1em 0;
padding:.6em 1em;border-radius:0 6px 6px 0;color:#243b53;}
blockquote p{margin:.3em 0;}
table{border-collapse:collapse;width:100%;margin:1.1em 0;font-size:.9em;}
th,td{border:1px solid var(--border);padding:8px 12px;text-align:left;vertical-align:top;}
th{background:var(--table-head);font-weight:600;}
tr:nth-child(even) td{background:#fafbfc;}
hr{border:none;border-top:1px solid var(--border);margin:2.2em 0;}
.mermaid{background:#fff;border:1px solid var(--border);border-radius:8px;padding:16px;
margin:1.2em 0;text-align:center;}
.doc-cover{border-bottom:3px solid var(--accent);margin-bottom:1.5em;padding-bottom:1em;}
.doc-cover .badge{display:inline-block;background:var(--accent);color:#fff;font-size:.72em;
font-weight:600;letter-spacing:.05em;padding:3px 10px;border-radius:20px;text-transform:uppercase;}
.toc{background:#fafbfc;border:1px solid var(--border);border-radius:8px;padding:8px 26px;margin:1.5em 0;}
.toc ul{margin:.3em 0;}
@media print{
 body{max-width:none;padding:0 12mm;font-size:11.5px;}
 h1{font-size:1.8em;}h2{font-size:1.35em;page-break-after:avoid;}
 h3,h4{page-break-after:avoid;}
 pre,table,blockquote,.mermaid{page-break-inside:avoid;}
 a{color:var(--fg);}
 tr:nth-child(even) td{background:#fafbfc !important;}
}
"""

HTML_TMPL = """<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>{css}</style>
<style>{pygments}</style>
</head>
<body>
{body}
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({{ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' }});
</script>
</body>
</html>
"""


def protect_mermaid(text):
    """Replace ```mermaid blocks with placeholders so markdown leaves them alone."""
    blocks = []

    def repl(m):
        blocks.append(m.group(1))
        return f"@@MERMAID_{len(blocks)-1}@@"

    text = re.sub(r"```mermaid\n(.*?)```", repl, text, flags=re.DOTALL)
    return text, blocks


def restore_mermaid(html, blocks):
    for i, block in enumerate(blocks):
        div = f'<pre class="mermaid">\n{block}</pre>'
        html = html.replace(f"@@MERMAID_{i}@@", div)
        # markdown may wrap the placeholder in <p>...</p>
        html = html.replace(f"<p>{div}</p>", div)
    return html


def convert(md_path, html_path, title, lang="en", pdf_path=None):
    with open(md_path, encoding="utf-8") as f:
        text = f.read()
    text, blocks = protect_mermaid(text)
    md = markdown.Markdown(
        extensions=["tables", "fenced_code", "codehilite", "toc", "attr_list", "sane_lists"],
        extension_configs={"codehilite": {"guess_lang": False}},
    )
    body = md.convert(text)
    body = restore_mermaid(body, blocks)
    html = HTML_TMPL.format(lang=lang, title=title, css=CSS, pygments=PYGMENTS_CSS, body=body)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {html_path}")
    # PDF (Mermaid blocks render as plain <pre>; text summaries cover them).
    if pdf_path:
        try:
            from weasyprint import HTML as WeasyHTML
            WeasyHTML(string=html).write_pdf(pdf_path)
            print(f"wrote {pdf_path}")
        except Exception as exc:  # noqa: BLE001
            print(f"PDF skipped for {pdf_path}: {exc}")


if __name__ == "__main__":
    base = sys.argv[1] if len(sys.argv) > 1 else "."
    convert(f"{base}/technical-documentation.md", f"{base}/technical-documentation.html",
            "OCB KPI Management — Technical Documentation", "en",
            f"{base}/technical-documentation.pdf")
    convert(f"{base}/user-manual.md", f"{base}/user-manual.html",
            "OCB KPI Management — Buku Panduan Pengguna", "id",
            f"{base}/user-manual.pdf")
    convert(f"{base}/deployment-windows.md", f"{base}/deployment-windows.html",
            "OCB KPI Management — Panduan Deployment (Windows/Laragon)", "id",
            f"{base}/deployment-windows.pdf")
