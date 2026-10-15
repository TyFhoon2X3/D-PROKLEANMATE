import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/mysql";
import { getServiceImageUrl, parseServiceImage } from "@/lib/service-images";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user)
    return {
      response: NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบ" },
        { status: 401 },
      ),
    };
  if (user.role !== "admin")
    return {
      response: NextResponse.json(
        { error: "ไม่มีสิทธิ์ดำเนินการ" },
        { status: 403 },
      ),
    };
  return { user };
}

export async function GET() {
  try {
    const { response } = await requireAdmin();
    if (response) return response;
    const database = getDatabase();
    const [services] = await database.execute(
      "SELECT id, name, starting_price, price, is_active, sort_order, created_at, image_data IS NOT NULL AS has_image FROM services ORDER BY sort_order, created_at",
    );
    return NextResponse.json({
      services: services.map((service) => ({
        ...service,
        image_url: getServiceImageUrl(service.id, service.has_image),
      })),
    });
  } catch (error) {
    console.error("Admin services lookup failed:", error);
    return NextResponse.json(
      { error: "โหลดรายการบริการไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;
    const body = await request.json();
    const name = String(body.name || "").trim();
    const price = String(body.price || "").trim();
    const image = body.image_data == null
      ? { imageData: null, mimeType: null }
      : parseServiceImage(body.image_data);
    if (!name || !price)
      return NextResponse.json(
        { error: "กรุณากรอกชื่อบริการและราคา" },
        { status: 400 },
      );
    if (!image)
      return NextResponse.json(
        { error: "รูปต้องเป็น JPEG, PNG หรือ WebP และมีขนาดไม่เกิน 1 MB" },
        { status: 400 },
      );
    const database = getDatabase();
    const [result] = await database.execute(
      "INSERT INTO services (name, starting_price, price, image_data, image_mime_type) VALUES (?, ?, ?, ?, ?)",
      [name, price, price, image.imageData, image.mimeType],
    );
    const [rows] = await database.execute(
      "SELECT id, name, starting_price, price, is_active, sort_order, created_at, image_data IS NOT NULL AS has_image FROM services WHERE id = ?",
      [result.insertId],
    );
    return NextResponse.json({
      service: {
        ...rows[0],
        image_url: getServiceImageUrl(rows[0].id, rows[0].has_image),
      },
    }, { status: 201 });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return NextResponse.json(
        { error: "มีบริการชื่อนี้แล้ว" },
        { status: 409 },
      );
    console.error("Service creation failed:", error);
    return NextResponse.json(
      { error: "เพิ่มบริการไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
