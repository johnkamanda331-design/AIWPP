import { useState } from "react";
import { useGetSettings, useUpdateSettings, SettingsUpdate } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, ShieldAlert, Wifi, Server, Cpu, Zap, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Settings() {
  const { data: settings, isLoading, refetch } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);

  // Instead of managing full form state locally which can be complex with nested objects,
  // we'll update directly on blur/change for standard industrial form behavior,
  // or use section-based save buttons.
  
  const handleSave = async (section: keyof SettingsUpdate, data: any) => {
    setSaving(true);
    try {
      await updateSettings.mutateAsync({ data: { [section]: data } });
      toast({ title: "Settings Saved", description: `${section} configuration updated.` });
      refetch();
    } catch (err) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRootSave = async (key: string, value: any) => {
    setSaving(true);
    try {
      await updateSettings.mutateAsync({ data: { [key]: value } });
      toast({ title: "Settings Saved", description: "Configuration updated." });
      refetch();
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <SettingsSkeleton />;
  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Device Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure controller parameters, protection thresholds, and communication.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto flex-nowrap">
          <TabsTrigger value="general" className="gap-2 py-2"><SettingsIcon className="w-4 h-4" /> General</TabsTrigger>
          <TabsTrigger value="protection" className="gap-2 py-2"><ShieldAlert className="w-4 h-4" /> Protection</TabsTrigger>
          <TabsTrigger value="learning" className="gap-2 py-2"><Cpu className="w-4 h-4" /> Learning</TabsTrigger>
          <TabsTrigger value="relay" className="gap-2 py-2"><Zap className="w-4 h-4" /> Relay</TabsTrigger>
          <TabsTrigger value="mqtt" className="gap-2 py-2"><Server className="w-4 h-4" /> MQTT</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Configuration</CardTitle>
              <CardDescription>Basic controller identification and localization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Controller Name</Label>
                  <Input 
                    defaultValue={settings.controllerName} 
                    onBlur={(e) => handleRootSave('controllerName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input 
                    defaultValue={settings.timezone} 
                    onBlur={(e) => handleRootSave('timezone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Electricity Rate (per kWh)</Label>
                  <div className="flex gap-2">
                    <Input 
                      className="w-20"
                      defaultValue={settings.currencySymbol} 
                      onBlur={(e) => handleRootSave('currencySymbol', e.target.value)}
                    />
                    <Input 
                      type="number" step="0.01"
                      defaultValue={settings.electricityRate} 
                      onBlur={(e) => handleRootSave('electricityRate', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="protection" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Hardware Protection Limits
              </CardTitle>
              <CardDescription>Absolute limits before emergency shutoff occurs.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Over-Current Threshold (Amps)</Label>
                  <Input 
                    type="number" step="0.1"
                    defaultValue={settings.protection.overCurrentThreshold} 
                    onBlur={(e) => handleSave('protection', { ...settings.protection, overCurrentThreshold: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Under-Voltage Threshold (Volts)</Label>
                  <Input 
                    type="number" step="1"
                    defaultValue={settings.protection.underVoltageThreshold} 
                    onBlur={(e) => handleSave('protection', { ...settings.protection, underVoltageThreshold: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Over-Temperature Threshold (°C)</Label>
                  <Input 
                    type="number" step="1"
                    defaultValue={settings.protection.overTempThreshold} 
                    onBlur={(e) => handleSave('protection', { ...settings.protection, overTempThreshold: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dry Run Timeout (Seconds)</Label>
                  <Input 
                    type="number" step="1"
                    defaultValue={settings.protection.dryRunTimeout} 
                    onBlur={(e) => handleSave('protection', { ...settings.protection, dryRunTimeout: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Similar TabsContent for learning, relay, mqtt... */}
        <TabsContent value="learning" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Adaptive Learning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 max-w-md">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Adaptive Learning</Label>
                  <p className="text-xs text-muted-foreground">Auto-adjust thresholds based on baseline</p>
                </div>
                <Switch 
                  checked={settings.learning.enabled}
                  onCheckedChange={(v) => handleSave('learning', { ...settings.learning, enabled: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Sensitivity</Label>
                <Select 
                  defaultValue={settings.learning.sensitivity}
                  onValueChange={(v) => handleSave('learning', { ...settings.learning, sensitivity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Fewer false positives)</SelectItem>
                    <SelectItem value="medium">Medium (Balanced)</SelectItem>
                    <SelectItem value="high">High (Maximum protection)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
