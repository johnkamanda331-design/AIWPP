import { useState } from "react";
import { useGenerateReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileText, Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const generate = useGenerateReport();
  const { toast } = useToast();
  const [formData, setFormData] = useState<any>({
    type: "comprehensive",
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    to: new Date().toISOString().split('T')[0], // today
    format: "pdf",
    includeCharts: true
  });

  const handleGenerate = async () => {
    try {
      const res = await generate.mutateAsync({ data: formData });
      if (res.status === 'ready' && res.downloadUrl) {
        toast({ title: "Report Generated", description: "Your report is downloading..." });
        // Simulating download
        window.open(res.downloadUrl, '_blank');
      } else {
        toast({ title: "Report Generating", description: "Your report is being generated in the background." });
      }
    } catch (err) {
      toast({ title: "Generation Failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate comprehensive system reports for compliance and auditing.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Report Generator</CardTitle>
          <CardDescription>Select parameters for your custom export.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comprehensive">Comprehensive System Audit</SelectItem>
                <SelectItem value="energy">Energy Consumption</SelectItem>
                <SelectItem value="faults">Fault History & Diagnostics</SelectItem>
                <SelectItem value="runtime">Runtime Log</SelectItem>
                <SelectItem value="voltage_quality">Power Quality Analysis</SelectItem>
                <SelectItem value="maintenance">Maintenance Recommendations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={formData.from} onChange={e => setFormData({...formData, from: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={formData.to} onChange={e => setFormData({...formData, to: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={formData.format} onValueChange={v => setFormData({...formData, format: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-destructive" /> PDF Document</div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-primary" /> CSV Data</div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-primary" /> Excel Spreadsheet</div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2"><FileJson className="w-4 h-4 text-warning" /> JSON API Format</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.format === 'pdf' && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded border">
              <div className="space-y-0.5">
                <Label>Include Charts & Graphs</Label>
                <p className="text-xs text-muted-foreground">Generates visual representations of data</p>
              </div>
              <Switch checked={formData.includeCharts} onCheckedChange={v => setFormData({...formData, includeCharts: v})} />
            </div>
          )}

          <Button onClick={handleGenerate} disabled={generate.isPending} className="w-full gap-2 mt-4" size="lg">
            {generate.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Generate & Download Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
