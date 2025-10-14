const express = require("express");
const { auth, isHRD } = require("../middleware/auth");
const Company = require("../models/company.model");
const { put } = require("@vercel/blob");

const router = express.Router();

// 🧠 Fungsi bantu untuk upload Base64 ke Vercel Blob
async function uploadBase64ToVercelBlob(base64Data, userId) {
  // Hilangkan prefix base64 jika ada (contoh: "data:image/png;base64,")
  const cleanedBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");

  // Convert ke Buffer
  const imageBuffer = Buffer.from(cleanedBase64, "base64");

  // Upload ke Vercel Blob
  const blob = await put(`company_logos/${userId}.png`, imageBuffer, {
    access: "public",
    contentType: "image/png",
    token: process.env.BLOB_READ_WRITE_TOKEN, // pastikan env ini diset di Vercel
  });

  return blob.url;
}

// ========================== ROUTES ==========================

// @route   GET /api/companies/me
// @desc    Get current company profile
// @access  Private (HRD)
router.get("/me", auth, isHRD, async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });

    if (!company) {
      return res
        .status(400)
        .json({ success: false, message: "No company profile found" });
    }

    res.json({ success: true, profile: company });
  } catch (err) {
    console.error("❌ Error fetching company profile:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   PUT /api/companies/me
// @desc    Update company profile + upload logo
// @access  Private (HRD)
router.put("/me", [auth, isHRD], async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const { name, address, phone, description, logo } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (address) updateFields.address = address;
    if (phone) updateFields.phone = phone;
    if (description) updateFields.description = description;

    // Jika ada logo dikirim → upload ke Vercel Blob
    if (logo) {
      try {
        const logoUrl = await uploadBase64ToVercelBlob(logo, req.user.id);
        updateFields.logo = logoUrl;
      } catch (uploadErr) {
        console.error("❌ Error uploading logo to Vercel Blob:", uploadErr);
        return res.status(500).json({
          success: false,
          message: "Failed to upload logo to storage",
        });
      }
    }

    // Update data di MongoDB
    const updatedCompany = await Company.findByIdAndUpdate(
      company._id,
      { $set: updateFields },
      { new: true }
    );

    res.json({
      success: true,
      message: "Company profile updated successfully",
      profile: updatedCompany,
    });
  } catch (err) {
    console.error("❌ Server error updating company profile:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating company profile",
    });
  }
});

module.exports = router;
