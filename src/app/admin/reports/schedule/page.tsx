"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, Mail, Clock, User, Send, CheckCircle2, XCircle } from "lucide-react";
import useSWR from "swr";
import { formatAppDateSync } from "@/lib/date-utils";
import { useTimezone } from "@/components/TimezoneProvider";

export default function ReportSchedulePage() {
  const router = useRouter();
  const tz = useTimezone();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data: logsData, mutate: mutateLogs } = useSWR("/api/admin/reports/schedule/logs", fetcher);
  
  const [enabled, setEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [scheduleTime, setScheduleTime] = useState("21:00");

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const res = await fetch("/api/admin/reports/schedule");
      if (res.ok) {
        const data = await res.json();
        if (data.schedule) {
          setEnabled(data.schedule.enabled);
          setEmailAddress(data.schedule.emailAddress);
          setOwnerName(data.schedule.ownerName);
          setScheduleTime(data.schedule.scheduleTime);
        }
      }
    } catch (error) {
      console.error("Failed to fetch schedule", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (enabled && (!emailAddress || !ownerName || !scheduleTime)) {
      toast.error("Please fill in all fields to enable scheduled reports.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/reports/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled,
          emailAddress,
          ownerName,
          scheduleTime,
        }),
      });

      if (res.ok) {
        toast.success("Schedule configuration saved successfully!");
        router.refresh();
      } else {
        toast.error("Failed to save schedule configuration.");
      }
    } catch (error) {
      toast.error("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTesting(true);
    try {
      const res = await fetch("/api/admin/reports/schedule/test", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Test email sent successfully!");
      } else {
        toast.error(data.message || "Failed to send test email.");
      }
      mutateLogs(); // Refresh logs after testing
    } catch (error) {
      toast.error("An error occurred while testing.");
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Report Schedule</h1>
        <p className="text-sm text-slate-500">
          Configure the automated daily sales summary email report.
        </p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Daily Sales Summary</CardTitle>
              <CardDescription>
                Automatically generate and email the daily sales summary (PDF and Excel).
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={enabled} 
                onCheckedChange={setEnabled} 
                className="data-[state=checked]:bg-[#A7066A]"
              />
              <Label className="font-medium">{enabled ? "Enabled" : "Disabled"}</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          
          <div className="space-y-2">
            <Label htmlFor="ownerName" className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              Owner Name
            </Label>
            <Input
              id="ownerName"
              placeholder="e.g. John Doe"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              disabled={!enabled}
              className="max-w-md"
            />
            <p className="text-xs text-slate-500">This name will be used in the email greeting.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailAddress" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              Recipient Email Address
            </Label>
            <Input
              id="emailAddress"
              type="email"
              placeholder="e.g. owner@soharpetcenter.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              disabled={!enabled}
              className="max-w-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduleTime" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              Delivery Time (24h)
            </Label>
            <Input
              id="scheduleTime"
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              disabled={!enabled}
              className="max-w-[150px]"
            />
            <p className="text-xs text-slate-500">The time of day the automated email will be triggered.</p>
          </div>

        </CardContent>
        <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end gap-3 p-4">
          <Button 
            onClick={handleTestEmail} 
            disabled={isTesting}
            variant="outline"
            className="text-slate-700"
          >
            {isTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Test Email
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-[#A7066A] hover:bg-[#8A0558] text-white"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-4">Email Logs</h2>
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-3">Date & Time</th>
                  <th scope="col" className="px-6 py-3">Subject</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Error Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {!logsData ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                    </td>
                  </tr>
                ) : logsData.logs?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No email logs found.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const sortedLogs = [...logsData.logs].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    const currentLogs = sortedLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
                    return currentLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatAppDateSync(new Date(log.createdAt), "MMM d, yyyy h:mm a", tz)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {log.subject}
                      </td>
                      <td className="px-6 py-4">
                        {log.status === "SUCCESS" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <XCircle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={log.errorMessage || ""}>
                        {log.errorMessage || "-"}
                      </td>
                    </tr>
                    ));
                  })()
                )}
              </tbody>
            </table>
          </div>
          {logsData && logsData.logs && logsData.logs.length > rowsPerPage && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50/50">
              <span className="text-sm text-slate-500">
                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, logsData.logs.length)} of {logsData.logs.length} entries
              </span>
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(logsData.logs.length / rowsPerPage)))}
                  disabled={currentPage >= Math.ceil(logsData.logs.length / rowsPerPage)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
