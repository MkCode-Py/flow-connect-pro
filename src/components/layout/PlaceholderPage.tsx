import { Construction } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <PageContainer>
      <PageHeader title={title} description={description} />
      <div className="border border-dashed border-border rounded-xl p-12 text-center bg-card/40">
        <Construction className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Esta seção será detalhada nas próximas etapas.</p>
      </div>
    </PageContainer>
  );
}
