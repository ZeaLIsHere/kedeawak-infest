"use client";

import { useState, useTransition } from "react";
import { SpeechInput } from "@/components/conversation/speech-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProductForm, type ProductFields } from "./product-form";
import { parseProductTranscriptAction } from "@/lib/actions/percakapan";

export function AddProduct() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choice" | "manual" | "assistant" | "review">(
    "choice",
  );
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<ProductFields>();
  const [pending, startTransition] = useTransition();
  function parse() {
    setError("");
    startTransition(async () => {
      try {
        const result = await parseProductTranscriptAction(text);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setProposal(result.product);
        setMode("review");
      } catch {
        setError("Data produk belum dapat diperiksa. Coba lagi atau isi sendiri.");
      }
    });
  }
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className="min-h-11"
            onClick={() => {
              setMode("choice");
              setText("");
              setError("");
              setProposal(undefined);
              setOpen(true);
            }}
          >
            Tambah produk
          </Button>
        </DialogTrigger>
        <DialogContent>
          {mode === "manual" || mode === "review" ? (
            <ProductForm
              initial={mode === "review" ? proposal : undefined}
              onSaved={() => setOpen(false)}
            />
          ) : (
            <>
              <DialogTitle>Tambah produk</DialogTitle>
              <DialogDescription>
                {mode === "choice"
                  ? "Pilih cara mencatat produk warung Anda."
                  : "Sebutkan nama, satuan, harga jual, harga beli, stok, dan ambang minimum. Penafsiran memakai DeepSeek dan memerlukan jaringan."}
              </DialogDescription>
              {mode === "choice" ? (
                <div className="mt-5 flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() => setMode("manual")}
                  >
                    Isi sendiri
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() => setMode("assistant")}
                  >
                    Tambah lewat asisten
                  </Button>
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-3">
                  <label
                    htmlFor="new-product-transcript"
                    className="text-caption font-medium"
                  >
                    Keterangan produk
                  </label>
                  <Input
                    id="new-product-transcript"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    disabled={pending}
                  />
                  <SpeechInput onTranscript={setText} disabled={pending} />
                  {error && (
                    <p role="alert" className="text-body text-destructive">
                      {error}
                    </p>
                  )}
                  <Button
                    className="min-h-11"
                    disabled={pending || !text.trim()}
                    onClick={parse}
                  >
                    {pending ? "Memeriksa produk" : "Periksa data produk"}
                  </Button>
                  <Button
                    className="min-h-11"
                    variant="outline"
                    onClick={() => setMode("manual")}
                  >
                    Isi sendiri
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
