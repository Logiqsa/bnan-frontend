import { ArrowLeft, House, SearchX } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-muted/30 to-muted p-4" dir="rtl">
      <Card className="w-full max-w-lg overflow-hidden border-primary/10 shadow-xl">
        <CardContent className="p-8 text-center sm:p-12">
          <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <SearchX className="h-12 w-12" />
          </div>
          <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-lg font-black text-primary">404</span>
          <h1 className="mt-4 text-3xl font-bold text-foreground">الصفحة غير موجودة</h1>
          <p className="mx-auto mt-3 max-w-sm leading-7 text-muted-foreground">الرابط غير صحيح أو أن الصفحة تم نقلها أو حذفها. يمكنك الرجوع للصفحة السابقة أو للرئيسية.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" variant="outline" className="gap-2" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" />العودة للخلف</Button>
            <Button asChild className="gap-2"><Link to="/"><House className="h-4 w-4" />العودة للرئيسية</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
