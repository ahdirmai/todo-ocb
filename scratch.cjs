const fs = require('fs');
let content = fs.readFileSync('resources/js/pages/reporting/show.tsx', 'utf8');

content = content.replace(
  /<th className="px-5 py-4 text-left font-medium whitespace-nowrap sticky left-0 z-10 bg-slate-50 border-r border-slate-200 shadow-\[2px_0_5px_-2px_rgba\(0,0,0,0\.05\)\]">\s*Task Name\s*<\/th>/g,
  `<th className="px-5 py-4 text-left font-medium whitespace-normal align-top min-w-[200px] max-w-[300px] sticky left-0 z-10 bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                                Task Name
                                                            </th>`
);

content = content.replace(
  /<th className="px-5 py-4 text-left font-medium whitespace-nowrap">\s*Status\s*<\/th>/g,
  `<th className="px-5 py-4 text-left font-medium whitespace-normal align-top min-w-[120px]">
                                                                Status
                                                            </th>`
);

content = content.replace(
  /<th className="px-5 py-4 text-left font-medium whitespace-nowrap">\s*Tanggal\s*<\/th>/g,
  `<th className="px-5 py-4 text-left font-medium whitespace-normal align-top min-w-[120px]">
                                                                Tanggal
                                                            </th>`
);

content = content.replace(
  /<th className="px-5 py-4 text-center font-medium whitespace-nowrap">\s*Comment\s*<\/th>/g,
  `<th className="px-5 py-4 text-center font-medium whitespace-normal align-top min-w-[100px]">
                                                                Comment
                                                            </th>`
);

content = content.replace(
  /<th className="px-5 py-4 text-center font-medium whitespace-nowrap">\s*Attachment\s*<\/th>/g,
  `<th className="px-5 py-4 text-center font-medium whitespace-normal align-top min-w-[100px]">
                                                                Attachment
                                                            </th>`
);

content = content.replace(
  /className="px-5 py-4 text-center font-medium whitespace-nowrap"\s*title=\{`Range/g,
  `className="px-5 py-4 text-center font-medium whitespace-normal align-top min-w-[120px]"
                                                                        title={\`Range`
);

content = content.replace(
  /<th className="px-5 py-4 text-center font-medium whitespace-nowrap">\s*Total\s*<\/th>/g,
  `<th className="px-5 py-4 text-center font-medium whitespace-normal align-top min-w-[100px]">
                                                                Total
                                                            </th>`
);

content = content.replace(
  /<th className="px-5 py-4 text-center font-medium whitespace-nowrap">\s*Max Score\s*<\/th>/g,
  `<th className="px-5 py-4 text-center font-medium whitespace-normal align-top min-w-[100px]">
                                                                Max Score
                                                            </th>`
);

content = content.replace(
  /<th className="px-5 py-4 text-center font-medium whitespace-nowrap">\s*Percentage\s*<\/th>/g,
  `<th className="px-5 py-4 text-center font-medium whitespace-normal align-top min-w-[100px]">
                                                                Percentage
                                                            </th>`
);

content = content.replace(
  /<th className="px-5 py-4 text-left font-medium whitespace-nowrap">\s*Kualitas\s*<\/th>/g,
  `<th className="px-5 py-4 text-left font-medium whitespace-normal align-top min-w-[180px]">
                                                                Kualitas
                                                            </th>`
);

content = content.replace(
  /<th className="px-5 py-4 text-left font-medium whitespace-nowrap">\s*Catatan\s*Admin\s*<\/th>/g,
  `<th className="px-5 py-4 text-left font-medium whitespace-normal align-top min-w-[200px]">
                                                                    Catatan
                                                                    Admin
                                                                </th>`
);

// Tbody updates
content = content.replace(
  /<td className="min-w-48 px-5 py-4 font-medium text-slate-900 sticky/g,
  `<td className="min-w-[200px] max-w-[300px] whitespace-normal align-top px-5 py-4 font-medium text-slate-900 sticky`
);

content = content.replace(
  /<td className="px-5 py-4 whitespace-nowrap text-slate-600">\s*\{task\.kolom_saat_ini/g,
  `<td className="px-5 py-4 whitespace-normal align-top text-slate-600 min-w-[120px]">
                                                                            {task.kolom_saat_ini`
);

content = content.replace(
  /<td className="px-5 py-4 whitespace-nowrap text-slate-600">\s*\{task\.due_date/g,
  `<td className="px-5 py-4 whitespace-normal align-top text-slate-600 min-w-[120px]">
                                                                            {task.due_date`
);

content = content.replace(
  /<td className="px-5 py-4 text-center text-slate-600">\s*\{\s*task\.total_komentar/g,
  `<td className="px-5 py-4 text-center align-top text-slate-600 min-w-[100px]">
                                                                            {
                                                                                task.total_komentar`
);

content = content.replace(
  /<td className="px-5 py-4 text-center text-slate-600">\s*\{\s*task\.total_attachment/g,
  `<td className="px-5 py-4 text-center align-top text-slate-600 min-w-[100px]">
                                                                            {
                                                                                task.total_attachment`
);

content = content.replace(
  /className="px-5 py-4 text-center"\s*title=\{/g,
  `className="px-5 py-4 text-center align-top min-w-[120px]"
                                                                                    title={`
);

content = content.replace(
  /<td className="px-5 py-4 text-center font-semibold text-slate-900">\s*\{\s*taskTotalScore/g,
  `<td className="px-5 py-4 text-center align-top font-semibold text-slate-900 min-w-[100px]">
                                                                            {
                                                                                taskTotalScore`
);

content = content.replace(
  /<td className="px-5 py-4 text-center text-slate-600">\s*\{\s*taskMaxScore/g,
  `<td className="px-5 py-4 text-center align-top text-slate-600 min-w-[100px]">
                                                                            {
                                                                                taskMaxScore`
);

content = content.replace(
  /<td className="px-5 py-4 text-center">\s*<span/g,
  `<td className="px-5 py-4 text-center align-top min-w-[100px]">
                                                                            <span`
);

content = content.replace(
  /<td className="max-w-48 px-5 py-4 text-xs text-slate-600">/g,
  `<td className="px-5 py-4 text-xs text-slate-600 align-top min-w-[180px]">`
);

content = content.replace(
  /<span\s*className="truncate whitespace-nowrap"\s*title=\{/g,
  `<span
                                                                                    className="whitespace-normal break-words"
                                                                                    title={`
);

content = content.replace(
  /<td className="px-5 py-4">/g,
  `<td className="px-5 py-4 align-top min-w-[200px]">`
);

content = content.replace(
  /<td className="px-5 py-4 text-xs text-slate-500">/g,
  `<td className="px-5 py-4 text-xs text-slate-500 align-top min-w-[200px] whitespace-normal break-words">`
);

content = content.replace(
  /className="h-8 w-16 text-center"/g,
  `className="h-8 w-full max-w-[80px] text-center mx-auto"`
);

fs.writeFileSync('resources/js/pages/reporting/show.tsx', content);
