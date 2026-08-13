import { badRequest, created, handler, requireUser } from "@/lib/api";
import { uploadImage, UploadError } from "@/lib/storage";

export const runtime = "nodejs";

// Menu photos are hardcoded under public/images/dishes now, so "menu" is no
// longer a valid folder here — this endpoint is just for review photos today.
const FOLDERS = ["reviews"] as const;
type Folder = (typeof FOLDERS)[number];

export const POST = handler(async (req: Request) => {
  await requireUser();

  const form = await req.formData();
  const file = form.get("file");
  const folderRaw = String(form.get("folder") ?? "reviews");

  if (!(file instanceof File)) throw badRequest("No file was uploaded");
  if (!FOLDERS.includes(folderRaw as Folder)) throw badRequest("Unknown upload folder");

  const folder = folderRaw as Folder;

  try {
    const result = await uploadImage(file, folder);
    return created(result);
  } catch (error) {
    if (error instanceof UploadError) throw badRequest(error.message);
    throw error;
  }
});
