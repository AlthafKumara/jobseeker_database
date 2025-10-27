const { put, del } = require('@vercel/blob');

/**
 * Upload buffer ke Vercel Blob dengan contentType dinamis.
 * Menyimpan file dengan nama asli (tidak diubah).
 */
async function uploadBufferToVercelBlob(buffer, fileName, mimeType) {
  const blob = await put(`uploads/${fileName}`, buffer, {
    access: 'public',
    contentType: mimeType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return blob.url;
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
  } catch (err) {
    console.error('⚠️ Error deleting blob file:', err.message);
  }
}

module.exports = { uploadBufferToVercelBlob, deleteFromVercelBlob };
