import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AutomationTabs({ value }: { value: "keywords" | "sequences" | "webhooks" }) {
  const nav = useNavigate();
  return (
    <Tabs value={value} onValueChange={(v) => { if (v !== value) nav(`/automation/${v}`); }}>
      <TabsList>
        <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
        <TabsTrigger value="sequences">Sequências</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
