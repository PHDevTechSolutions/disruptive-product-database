import type { NextApiRequest, NextApiResponse } from "next";
import cloudinary from "@/lib/cloudinary";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { images } = req.body;

    const uploads = await Promise.all(
      images.map((img: string) =>
        cloudinary.uploader.upload(img, {
          folder: "products",
        }),
      ),
    );

    res.status(200).json(
      uploads.map((u) => u.secure_url),
    );
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
}
