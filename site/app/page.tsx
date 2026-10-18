import { VisaInfoCard } from "@/components/visa/visa-info-card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-muted px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-pinar text-2xl font-bold text-foreground">
          تایلندگرد: راهنمای سفر به تایلند
        </h1>

        <VisaInfoCard
          status="on-arrival"
          validity="۳۰ روز"
          description="دارندگان گذرنامهٔ ایرانی می‌توانند ویزای Tourist Visa on Arrival را در فرودگاه‌های تعیین‌شدهٔ تایلند دریافت کنند."
        />
      </div>
    </main>
  );
}
