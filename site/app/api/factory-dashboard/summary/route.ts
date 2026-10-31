import { NextResponse } from "next/server";
import { getFactoryDashboard } from "@/lib/factory-dashboard/data";
import { getDashboardGate } from "@/lib/factory-dashboard/gate";
import { SESSION_COOKIE } from "@/lib/dashboard/auth";

/* مسیر API فقط‌خواندنی داشبورد کارخانه. فقط GET دارد و فقط SELECT
   می‌زند (در getFactoryDashboard). کاربر غیرمجاز 401 می‌گیرد و هیچ
   داده‌ای برنمی‌گردد. هیچ متد نوشتن و هیچ بدنهٔ ورودی در این مسیر
   نیست. نام سگمنت summary است چون data/ در site/.gitignore نادیده
   گرفته می‌شود و مسیر data هرگز کامیت نمی‌شد. */

export async function GET(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  const gate = await getDashboardGate(
    cookie ? decodeURIComponent(cookie) : undefined,
  );
  if (gate !== "allow") {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const result = await getFactoryDashboard();
  return NextResponse.json(result);
}
