import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSection } from "../components/ProfileSection";
import { CompanySection } from "../components/CompanySection";
import { ServiceHoursSection } from "../components/ServiceHoursSection";
import { AutomationSection } from "../components/AutomationSection";
import { CustomFieldsSection } from "../components/CustomFieldsSection";
import { SecuritySection } from "../components/SecuritySection";
import { AppearanceSection } from "../components/AppearanceSection";

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Configurações"
        description="Perfil, empresa, atendimento, automação, campos personalizados, segurança e aparência."
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="flex flex-wrap h-auto p-1 bg-card border border-border">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="service">Atendimento</TabsTrigger>
          <TabsTrigger value="automation">Automação</TabsTrigger>
          <TabsTrigger value="fields">Campos</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
        </TabsList>

        <div className="mt-5 max-w-3xl">
          <TabsContent value="profile"><ProfileSection /></TabsContent>
          <TabsContent value="company"><CompanySection /></TabsContent>
          <TabsContent value="service"><ServiceHoursSection /></TabsContent>
          <TabsContent value="automation"><AutomationSection /></TabsContent>
          <TabsContent value="fields"><CustomFieldsSection /></TabsContent>
          <TabsContent value="security"><SecuritySection /></TabsContent>
          <TabsContent value="appearance"><AppearanceSection /></TabsContent>
        </div>
      </Tabs>
    </PageContainer>
  );
}
