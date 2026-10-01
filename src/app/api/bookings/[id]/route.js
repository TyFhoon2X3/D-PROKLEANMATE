import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/mysql";

export async function GET(_request, { params }) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const { id } = await params;
    if (!/^\d+$/.test(id))
      return NextResponse.json({ error: "ไม่พบรายการจองนี้" }, { status: 404 });
    const database = getDatabase();
    const [rows] =
      user.role === "admin"
        ? await database.execute("SELECT * FROM bookings WHERE id = ?", [id])
        : await database.execute(
            "SELECT * FROM bookings WHERE id = ? AND user_id = ?",
            [id, user.id],
          );
    if (!rows.length)
      return NextResponse.json({ error: "ไม่พบรายการจองนี้" }, { status: 404 });
    const booking = rows[0];
    if (booking.payment_slip_url)
      booking.payment_slip_url = `/api/bookings/${id}/slip`;
    return NextResponse.json({ booking, isAdmin: user.role === "admin" });
  } catch (error) {
    console.error("Booking lookup failed:", error);
    return NextResponse.json(
      { error: "โหลดรายละเอียดการจองไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const { id } = await params;
    const database = getDatabase();
    const [result] = await database.execute(
      "DELETE FROM bookings WHERE id = ? AND user_id = ? AND status = 'pending'",
      [id, user.id],
    );
    if (!result.affectedRows)
      return NextResponse.json(
        { error: "ยกเลิกได้เฉพาะรายการที่รอการยืนยัน" },
        { status: 409 },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Booking cancellation failed:", error);
    return NextResponse.json(
      { error: "ยกเลิกรายการจองไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (user.role !== "admin")
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์ดำเนินการ" },
        { status: 403 },
      );

    const { id } = await params;
    const body = await request.json();
    const allowedFields = [
      "status",
      "service_date",
      "site_visit_date",
      "service_date_confirmed",
      "admin_price",
    ];
    const entries = Object.entries(body).filter(([field]) =>
      allowedFields.includes(field),
    );
    if (!entries.length)
      return NextResponse.json(
        { error: "ไม่มีข้อมูลที่แก้ไขได้" },
        { status: 400 },
      );
    const nextStatus = body.status;
    if (
      nextStatus &&
      ![
        "pending",
        "quote",
        "awaiting_payment",
        "confirmed",
        "cancelled",
        "completed",
      ].includes(nextStatus)
    ) {
      return NextResponse.json(
        { error: "สถานะรายการจองไม่ถูกต้อง" },
        { status: 400 },
      );
    }
    const values = entries.map(([field, value]) => {
      if (field === "admin_price")
        return value === "" || value == null ? null : Number(value);
      if (field.endsWith("_date")) return value || null;
      return value;
    });
    if (
      entries.some(
        ([field], index) =>
          field === "admin_price" &&
          values[index] !== null &&
          (!Number.isFinite(values[index]) || values[index] < 0),
      )
    ) {
      return NextResponse.json(
        { error: "ราคาต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" },
        { status: 400 },
      );
    }

    const database = getDatabase();
    const nextServiceDate = body.service_date;
    if (nextServiceDate) {
      const [[{ today }]] = await database.query(
        "SELECT CURRENT_DATE() AS today",
      );
      if (nextServiceDate < today)
        return NextResponse.json(
          { error: "ไม่สามารถกำหนดวันที่ย้อนหลังได้" },
          { status: 400 },
        );
    }
    const assignments = entries.map(([field]) => `\`${field}\` = ?`).join(", ");
    const [result] = await database.execute(
      `UPDATE bookings SET ${assignments} WHERE id = ?`,
      [...values, id],
    );
    if (!result.affectedRows)
      return NextResponse.json({ error: "ไม่พบรายการจองนี้" }, { status: 404 });
    const [rows] = await database.execute(
      "SELECT * FROM bookings WHERE id = ?",
      [id],
    );
    const booking = rows[0];
    if (booking.payment_slip_url)
      booking.payment_slip_url = `/api/bookings/${id}/slip`;
    return NextResponse.json({ booking });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return NextResponse.json(
        { error: "วันที่นี้มีรายการจองแล้ว" },
        { status: 409 },
      );
    if (error.code === "ER_CHECK_CONSTRAINT_VIOLATED" || error.errno === 3819) {
      return NextResponse.json(
        { error: "วันที่เข้าประเมินสถานที่ต้องไม่ตรงกับวันที่เข้าทำความสะอาด" },
        { status: 400 },
      );
    }
    console.error("Booking update failed:", error);
    return NextResponse.json(
      { error: "แก้ไขรายการจองไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
