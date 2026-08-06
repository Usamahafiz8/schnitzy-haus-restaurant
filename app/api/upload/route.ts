import { badRequest, created, handler, requireUser } from "@/lib/api";
import { uploadImage, UploadError } from "@/lib/storage";
import { STAFF_ROLES } from "@/types";

export const runtime = "nodejs";

const FOLDERS = ["menu", "reviews", "restaurant"] as const;
type Folder = (typeof FOLDERS)[number];

export const POST = handler(async (req: Request) => {
  const user = await requireUser();

  const form = await req.formData();
  const file = form.get("file");
  const folderRaw = String(form.get("folder") ?? "menu");

  if (!(file instanceof File)) throw badRequest("No file was uploaded");
  if (!FOLDERS.includes(folderRaw as Folder)) throw badRequest("Unknown upload folder");

  const folder = folderRaw as Folder;

  // Customers may only attach photos to their own reviews.
  if (folder !== "reviews" && !STAFF_ROLES.includes(user.role)) {
    throw badRequest("You don't have permission to upload there");
  }

  try {
    const result = await uploadImage(file, folder);
    return created(result);
  } catch (error) {
    if (error instanceof UploadError) throw badRequest(error.message);
    throw error;
  }
});
