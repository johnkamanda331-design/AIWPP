import { useState } from "react";
import { useGetEvents, EventSeverity } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, AlertCircle, Info, AlertTriangle, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Events() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<string>("all");
  
  const { data, isLoading } = useGetEvents({
    query: {
      queryKey: ["events", search, severity],
    }
  });

  const getIcon = (sev: EventSeverity) => {
    switch(sev) {
      case "critical": return <ShieldAlert className="w-5 h-5 text-destructive" />;
      case "high": return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "medium": return <AlertCircle className="w-5 h-5 text-warning" />;
      case "info": return <Info className="w-5 h-5 text-info" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Event Timeline</h1>
        <p className="text-sm text-muted-foreground mt-1">Chronological log of all system activities, faults, and user actions.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search events..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical Only</SelectItem>
              <SelectItem value="high">High Only</SelectItem>
              <SelectItem value="medium">Medium Only</SelectItem>
              <SelectItem value="info">Info Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <EventsSkeleton />
      ) : data?.events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Info className="w-12 h-12 mb-4 opacity-50" />
            <p>No events match your criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:inset-0 before:ml-8 sm:before:ml-10 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {data?.events.map((event, i) => (
            <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              
              {/* Timeline marker */}
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10",
                event.severity === 'critical' || event.severity === 'high' ? 'bg-destructive/10' :
                event.severity === 'medium' ? 'bg-warning/10' : 'bg-info/10'
              )}>
                {getIcon(event.severity)}
              </div>

              {/* Card */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)]">
                <Card className={cn(
                  "shadow-sm transition-shadow hover:shadow-md",
                  event.severity === 'critical' ? 'border-destructive/50 shadow-destructive/10' : ''
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        {event.type}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">{event.description}</h4>
                    {event.details && (
                      <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3 mt-2">
                        {event.details}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.total > data.events.length && (
        <div className="flex justify-center mt-8">
          <Button variant="outline">Load More Events</Button>
        </div>
      )}
    </div>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-6 relative pl-8">
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border -translate-x-px" />
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-[1.35rem] top-4 w-5 h-5 rounded-full bg-muted border-4 border-background z-10" />
          <Skeleton className="h-28 w-full max-w-2xl" />
        </div>
      ))}
    </div>
  );
}
