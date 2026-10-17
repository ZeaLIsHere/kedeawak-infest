import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Uji komponen dasar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="size-5" />
            <span>Komponen shadcn/ui dan ikon SVG tampil.</span>
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Button>Tombol utama</Button>
            <Badge>Contoh lencana</Badge>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
