# Implementasi Fitur Dokumen dan File Management

Plan ini bertujuan untuk membuat sistem manajemen dokumen dan file di dalam fitur Tim (Teams), yang mencakup pembuatan folder, pembuatan dokumen dengan format menyerupai Blog, serta upload file langsung.

## Constraints & Requirements
- Fitur "Dokumen" (seperti Blog) **memerlukan** fitur komentar di bawah dokumen.
- Batasan maksimal ukuran upload untuk tipe 'File' adalah **10 MB**.
- Ekstensi dokumen yang diperbolehkan hanya: **pdf**, **word (.doc, .docx)**, **excel (.xls, .xlsx)**.

## Proposed Changes

### Database & Models
Akan dibuat tabel baru untuk mengelola hierarki file dan dokumen.

#### `create_documents_table.php` (Migration)
Menyimpan struktur folder, file, dan dokumen text.
- `id` (uuid)
- `team_id` (foreign key ke teams)
- `user_id` (creator)
- `parent_id` (nullable foreign key ke documents.id untuk folder di dalam folder)
- `name` (string, nama file/folder/dokumen)
- `type` (enum/string: 'folder', 'document', 'file')
- `content` (longText, nullable - digunakan jika type 'document' semacam blog)

#### `add_document_id_to_comments_table.php` (Migration)
Menambahkan kolom constraint untuk membolehkan komentar pada model Dokumen.
- `document_id` (nullable foreign uuid ke table documents cascade on delete)

#### `app/Models/Document.php`
- Relasi `team()`, `user()`, `parent()`, `children()`, `comments()`.
- Mengimplementasikan `Spatie\MediaLibrary\HasMedia` dan trait `InteractsWithMedia` agar dapat melampirkan file fisik untuk `type = 'file'`.

---

### Backend & Controllers

#### `app/Http/Controllers/TeamDocumentController.php`
Menambahkan controller dengan metode:
- `index()`: Mengambil daftar item berdasarkan root atau `parent_id` (isi sebuah folder).
- `storeFolder()`: Menyimpan folder baru.
- `storeDocument()`: Menyimpan text-based dokument ("Blog").
- `storeFile()`: Mengunggah dan melampirkan file dengan Spatie Media Library. (Validation limit 10MB, mimes:pdf,doc,docx,xls,xlsx).
- `show()`: Membaca isi "Dokumen/Blog" secara penuh.
- `update()`: Mengedit nama atau konten.
- `destroy()`: Menghapus folder/file/dokumen dan media terkait.

#### `app/Http/Controllers/DocumentCommentController.php`
- `store()`: Menyimpan komentar pada dokumen.

#### `routes/web.php`
Menambahkan route resource bersarang untuk dokumen tim:
```php
Route::prefix('teams/{team}')->group(function () {
    Route::post('documents/folder', [TeamDocumentController::class, 'storeFolder'])->name('documents.folder.store');
    Route::post('documents/file', [TeamDocumentController::class, 'storeFile'])->name('documents.file.store');
    Route::post('documents/{document}/comments', [DocumentCommentController::class, 'store'])->name('documents.comments.store');
    Route::resource('documents', TeamDocumentController::class);
});
```

---

### Frontend

#### `resources/js/pages/teams/partials/dokumen-tab.tsx`
- Menampilkan UI *File Manager-style*.
- Mendukung "Breadcrumbs" internal (misal: Main Directory > Folder A > Folder B).
- Menambahkan actions "Buat Folder", "Buat Dokumen", "Upload File".
- Membedakan redering UI berdasarkan tipe (`folder` vs `document` vs `file`).

#### `resources/js/pages/teams/documents/show.tsx`
Halaman stand-alone untuk membaca Dokumen text yang semacam blog, dirender dengan layout yang bagus dan mudah dibaca, serta terdapat space untuk fitur komentar di bawahnya.

#### `resources/js/pages/teams/documents/form.tsx`
Komponen formulir atau modal untuk menulis/mengedit konten Dokumen (Blog) text secara rich.

---

### Update v2 (Edit, File Versioning, dan Activity Logs)

#### 1. Activity Logs
- Menggunakan `App\Services\ActivityLogger` untuk mencatat log semua peristiwa modifikasi: `storeFolder`, `storeDocument`, `storeFile`, `update`, file replacement, dan `destroy`.
- Log ini masuk ke stream _Activity Logs_ yang bisa dilihat oleh tim atau Admin (`/activity`).

#### 2. Edit Document
- **Route Baru**: `GET /teams/{team:slug}/documents/{document}/edit`
- **Frontend Baru**: `resources/js/pages/teams/documents/edit.tsx`
- Membolehkan *owner* atau *admin* memperbarui `name`, konten text Tiptap, dan menambah/menghapus *attachment* (lampiran gambar/referensi dokumen tipe `document`).

#### 3. Update File (Versioning)
- Alih-alih menghapus dan menimpa *file* milik `DocItem` (ketika user memilih opsi Perbarui File), aplikasi menggunakan kapabilitas versioning Spatie Media Library.
- **Route Baru**: `POST /teams/{team:slug}/documents/{document}/update-file`
- Media baru ditambahkan ke koleksi `files`, tapi rekaman *Media* lama tetap bertahan di _database_. Media yang terakhir didapatkan dianggap sebagai versi terkini.
