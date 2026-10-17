"use client";

import { useState, useTransition } from "react";
import { SpeechInput } from "@/components/conversation/speech-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseSaleTranscriptAction } from "@/lib/actions/percakapan";
import type { listProducts } from "@/lib/data/products";
import { formatNumber } from "@/lib/format/number";

type Proposal = { productId: string; quantity: number };
type Props = {
  products: Awaited<ReturnType<typeof listProducts>>;
  onApply: (items: Proposal[]) => void;
  disabled: boolean;
};
export function SaleAssistant({ products, onApply, disabled }: Props) {
  const [text, setText] = useState("");
  const [proposal, setProposal] = useState<Proposal[] | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  function parse() {
    setProposal(null);
    setNotice("");
    startTransition(async () => {
      try {
        const result = await parseSaleTranscriptAction(text);
        if (!result.ok) {
          setNotice(result.error);
          return;
        }
        setProposal(result.items);
        setNotice(
          result.unmatched.length
            ? `Produk belum dikenali: ${result.unmatched.join(", ")}. Periksa atau cari produk secara manual.`
            : "Periksa jumlah barang sebelum memasukkannya ke keranjang.",
        );
      } catch {
        setNotice(
          "Pesanan belum dapat diperiksa. Coba lagi atau pilih produk secara manual.",
        );
      }
    });
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-muted-foreground">
        Sebutkan pesanan atau ketik, lalu periksa hasilnya. Penafsiran memakai DeepSeek
        dan memerlukan jaringan.
      </p>
      <label className="text-caption font-medium" htmlFor="sale-transcript">
        Pesanan pelanggan
      </label>
      <Input
        id="sale-transcript"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setProposal(null);
        }}
        disabled={pending || disabled}
      />
      <div className="flex flex-wrap gap-2">
        <SpeechInput
          onTranscript={(value) => {
            setText(value);
            setProposal(null);
          }}
          disabled={pending || disabled}
        />
        <Button
          className="min-h-11"
          variant="outline"
          disabled={pending || disabled || !text.trim()}
          onClick={parse}
        >
          {pending ? "Memeriksa pesanan" : "Periksa pesanan"}
        </Button>
      </div>
      {notice && (
        <p role="status" className="text-body text-muted-foreground">
          {notice}
        </p>
      )}
      {proposal && proposal.length > 0 && (
        <div className="rounded-md border border-border p-3">
          <ul className="space-y-2">
            {proposal.map((item) => (
              <li key={item.productId} className="text-body">
                {products.find((product) => product.id === item.productId)?.name} sebanyak{" "}
                {formatNumber(item.quantity)}
              </li>
            ))}
          </ul>
          <Button
            className="mt-3 min-h-11"
            variant="outline"
            disabled={disabled}
            onClick={() => {
              onApply(proposal);
              setProposal(null);
              setText("");
            }}
          >
            Masukkan ke keranjang
          </Button>
        </div>
      )}
    </div>
  );
}
