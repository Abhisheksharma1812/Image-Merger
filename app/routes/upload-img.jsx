/* export async function loader({ request }) {
  console.log("LOADER HIT");
  console.log(request.url);

  return Response.json({
    success: true,
    url: request.url,
  });
}

export async function action({ request }) {
  console.log("ACTION HIT");
  console.log(request.url);

  return Response.json({
    success: true,
    url: request.url,
  });
}
 */


import { json } from "@remix-run/node";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config({ path: [".env.env", ".env"] });

// Configure Cloudinary Integration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a browser File object to Cloudinary.
 */
const uploadToCloudinary = async (file, folder = "shopify-designs") => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name || "design";
  const baseName = fileName.replace(/\.[^.]+$/, "") || "design";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
        use_filename: false,
        public_id: `${baseName}-${Date.now()}`,
      },
      (error, result) => {
        if (error) return reject(error);

        if (!result?.secure_url) {
          return reject(new Error("Cloudinary upload completed without a secure URL"));
        }

        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          folder: result.folder || folder,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder")?.toString() || "shopify-designs";

    if (!(file instanceof File)) {
      return json({ success: false, message: "No file content processed" }, { status: 400 });
    }

    const uploadResult = await uploadToCloudinary(file, folder);

    return json({
      success: true,
      url: uploadResult.url,
      public_id: uploadResult.public_id,
      folder: uploadResult.folder,
    });
  } catch (err) {
    console.error("Cloudinary Engine Catch Block Intercept:", err);
    return json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server upload block error",
      },
      {
        status: 500,
      }
    );
  }
}

// Keep your loader handler intact to handle the Shopify handshake requests smoothly
export async function loader({ request }) {
  console.log("LOADER HIT");
  return json({
    success: true,
    message: "Proxy endpoint live",
  });
}
