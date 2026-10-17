"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveBusinessProfileAction } from "@/lib/actions/profil";

export type ProfileFormValues = {
  readonly name: string;
  readonly ownerName: string | null;
  readonly businessType: string | null;
  readonly address: string | null;
  readonly phoneNumber: string | null;
  readonly description: string | null;
  readonly opensAt: string | null;
  readonly closesAt: string | null;
};

export function ProfileForm({ values }: { readonly values: ProfileFormValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setMessage("");
    setFailed(false);

    startTransition(async () => {
      const result = await saveBusinessProfileAction(data);

      if (!result.ok) {
        setFailed(true);
        setMessage(result.error);
        return;
      }

      setMessage("Profil tersimpan dan dipakai agen AI.");
      router.refresh();
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nama pemilik
          <Input
            name="ownerName"
            defaultValue={values.ownerName ?? ""}
            maxLength={80}
            placeholder="Contoh: Rina"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nama usaha
          <Input
            name="name"
            defaultValue={values.name}
            maxLength={120}
            required
            placeholder="Contoh: Warung Sembako Bu Rina"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Jenis usaha
          <Input
            name="businessType"
            defaultValue={values.businessType ?? ""}
            maxLength={80}
            placeholder="Contoh: Sembako dan kebutuhan harian"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nomor telepon
          <Input
            name="phoneNumber"
            defaultValue={values.phoneNumber ?? ""}
            inputMode="tel"
            maxLength={24}
            placeholder="Contoh: 081234567890"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Jam buka
          <Input
            name="opensAt"
            type="time"
            defaultValue={values.opensAt?.slice(0, 5) ?? ""}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Jam tutup
          <Input
            name="closesAt"
            type="time"
            defaultValue={values.closesAt?.slice(0, 5) ?? ""}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Alamat
        <Input
          name="address"
          defaultValue={values.address ?? ""}
          maxLength={200}
          placeholder="Contoh: Jalan Melati nomor 12, Medan"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Deskripsi usaha
        <textarea
          name="description"
          defaultValue={values.description ?? ""}
          maxLength={500}
          rows={3}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Contoh: Menjual sembako dan kebutuhan harian, melayani pesanan WhatsApp."
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="min-h-11" disabled={pending}>
          {pending ? "Menyimpan profil" : "Simpan profil"}
        </Button>
        {message && (
          <p
            role={failed ? "alert" : "status"}
            className={`text-sm ${failed ? "text-destructive" : "text-muted-foreground"}`}
          >
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
