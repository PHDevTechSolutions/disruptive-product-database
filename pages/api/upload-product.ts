import type { NextApiRequest, NextApiResponse } from "next";
import cloudinary from "@/lib/cloudinary";
import formidable, { File } from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // REQUIRED for formidable
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ================= METHOD GUARD =================
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ================= PARSE FORM =================
    const form = formidable({
      multiples: false,
      keepExtensions: true,
    });

    const { files } = await new Promise<{
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(req, (err, _fields, files) => {
        if (err) reject(err);
        resolve({ files });
      });
    });

    // ================= GET FILE =================
    const uploadedFile = files.file as File | File[] | undefined;

    if (!uploadedFile) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = Array.isArray(uploadedFile)
      ? uploadedFile[0]
      : uploadedFile;

    // ================= FILE TYPE CHECK =================
    const isRaw =
      file.mimetype?.includes("pdf") ||
      file.mimetype?.includes("word") ||
      file.mimetype?.includes("officedocument");

    // ================= CLOUDINARY UPLOAD =================
    const uploadResult = await cloudinary.uploader.upload(file.filepath, {
      folder: "products",
      resource_type: isRaw ? "raw" : "auto",
      use_filename: true,
      unique_filename: false,
    });

    // ================= CLEANUP =================
    fs.unlinkSync(file.filepath);

    // ================= FIX URL (🔥 IMPORTANT) =================
    const fixedUrl =
      uploadResult.resource_type === "raw"
        ? uploadResult.secure_url.replace("/image/upload/", "/raw/upload/")
        : uploadResult.secure_url;

    // ================= SUCCESS =================
    return res.status(200).json({
      secure_url: fixedUrl,
      public_id: uploadResult.public_id,
      resource_type: uploadResult.resource_type,
      original_filename: uploadResult.original_filename,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return res.status(500).json({ error: "Upload failed" });
  }
}
