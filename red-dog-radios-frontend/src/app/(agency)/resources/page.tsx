"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Item = { title: string; body: string };

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function ItemCard({ item }: { item: Item }) {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="[font-family:'Montserrat',Helvetica] text-sm font-bold text-[#111827]">{item.title}</h3>
        </div>
        <Button
          variant="outline"
          className="border-[#e5e7eb] bg-white"
          disabled={copying}
          onClick={async () => {
            try {
              setCopying(true);
              await copyToClipboard(item.body);
              toast({ title: "Copied" });
            } catch {
              toast({ title: "Copy failed", variant: "destructive" });
            } finally {
              setCopying(false);
            }
          }}
        >
          {copying ? "Copying…" : "Copy"}
        </Button>
      </div>

      <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-4 text-sm text-[#374151] [font-family:'Montserrat',Helvetica]">
        {item.body}
      </pre>
    </div>
  );
}

export default function ResourcesPage() {
  // IMPORTANT: Per your instructions, these must come from the client spec (Parts 4/6/7).
  // This page ships the UI + copy affordances without introducing any infra.
  const grantWritingPrompts = useMemo<Item[]>(() => [], []);
  const funderEmailTemplates = useMemo<Item[]>(() => [], []);
  const winningPatterns = useMemo<Item[]>(() => [], []);

  const emptyState = (
    <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-white p-10 text-center">
      <p className="[font-family:'Montserrat',Helvetica] text-sm font-semibold text-[#111827]">Content not loaded yet</p>
      <p className="mt-1 [font-family:'Montserrat',Helvetica] text-xs text-[#6b7280]">
        Paste the exact spec content (Parts 4, 6, 7) and we’ll drop it in verbatim.
      </p>
    </div>
  );

  const list = (items: Item[]) =>
    items.length === 0 ? (
      emptyState
    ) : (
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((it) => (
          <ItemCard key={it.title} item={it} />
        ))}
      </div>
    );

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 bg-neutral-50 p-4 pb-10 sm:p-6 lg:p-8">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="[font-family:'Oswald',Helvetica] text-2xl font-bold uppercase leading-tight tracking-[0.5px] text-black sm:text-3xl break-words">
          Resources
        </h1>
        <p className="[font-family:'Montserrat',Helvetica] text-sm font-normal text-[#6b7280] max-w-prose break-words">
          Copy/paste-ready prompts and templates to move faster.
        </p>
      </div>

      <Tabs defaultValue="prompts" className="w-full">
        <TabsList className="bg-white border border-[#e5e7eb]">
          <TabsTrigger value="prompts">Grant Writing Prompts</TabsTrigger>
          <TabsTrigger value="templates">Funder Email Templates</TabsTrigger>
          <TabsTrigger value="patterns">Winning Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="mt-4">
          {list(grantWritingPrompts)}
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          {list(funderEmailTemplates)}
        </TabsContent>
        <TabsContent value="patterns" className="mt-4">
          {list(winningPatterns)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

