const { put, del } = require('@vercel/blob');

/**
 * Upload buffer ke Vercel Blob dengan nama file aman dan contentType dinamis.
 * - Mengganti spasi menjadi underscore agar tidak muncul %20 di URL.
 * - Menyimpan di folder 'uploads/' dengan nama asli yang sudah dibersihkan.
 * - Bisa digunakan untuk PDF, image, dll.
 */
async function uploadBufferToVercelBlob(buffer, fileName, mimeType) {
  try {
    if (!buffer || !fileName) {
      throw new Error('Buffer dan nama file wajib diisi');
    }

    // 🔹 Ganti spasi dengan underscore dan hapus karakter berbahaya
    const safeFileName = fileName
      .trim()
      .replace(/\s+/g, '_') // spasi → underscore
      .replace(/[^\w.\-()]/g, ''); // hanya huruf, angka, titik, strip, kurung

    const blob = await put(`uploads/${safeFileName}`, buffer, {
      access: 'public',
      contentType: mimeType || 'application/octet-stream',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log(`✅ File uploaded to Vercel Blob: ${blob.url}`);
    return blob.url;
  } catch (err) {
    console.error('❌ Error uploading to Vercel Blob:', err.message);
    throw err;
  }
}

/**
 * Menghapus file dari Vercel Blob berdasarkan URL.
 */
async function deleteFromVercelBlob(fileUrl) {
  try {
    if (!fileUrl) return;

    await del(fileUrl, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log(`🗑️ File deleted from Vercel Blob: ${fileUrl}`);
  } catch (err) {
    console.error('⚠️ Error deleting blob file:', err.message);
  }
}

module.exports = { uploadBufferToVercelBlob, deleteFromVercelBlob };
