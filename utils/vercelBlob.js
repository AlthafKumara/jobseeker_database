const { put } = require('@vercel/blob');

async function uploadBufferToVercelBlob(buffer, fileName) {
  const blob = await put(fileName, buffer, {
    access: 'public',
    contentType: 'image/png',
  });
  return blob.url; 
}

module.exports = { uploadBufferToVercelBlob };
