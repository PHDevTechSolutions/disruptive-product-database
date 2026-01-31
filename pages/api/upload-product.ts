import type { NextApiRequest, NextApiResponse } from "next";
import cloudinary from "@/lib/cloudinary";
import formidable, { File } from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // REQUIRED for file uploads
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 🔹 Parse multipart/form-data correctly
    const form = formidable({
      multiples: false,
      keepExtensions: true,
    });

    const { files } = await new Promise<{
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(
        req,
        (
          err: Error | null, // ✅ FIXED TYPE
          _fields: formidable.Fields,
          files: formidable.Files
        ) => {
          if (err) reject(err);
          resolve({ files });
        }
      );
    });

    // 🔹 IMPORTANT: must match formData.append("file", file)
    const uploadedFile = files.file as File | File[] | undefined;

    if (!uploadedFile) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = Array.isArray(uploadedFile)
      ? uploadedFile[0]
      : uploadedFile;

    // 🔹 Upload to Cloudinary (IMAGE / VIDEO auto-detect)
    const uploadResult = await cloudinary.uploader.upload(file.filepath, {
      folder: "products",
      resource_type: "auto", // ✅ image + video
    });

    // 🔹 Cleanup temp file
    fs.unlinkSync(file.filepath);

    return res.status(200).json(uploadResult);
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return res.status(500).json({ error: "Upload failed" });
  }
}
