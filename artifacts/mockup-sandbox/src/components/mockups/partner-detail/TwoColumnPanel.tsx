import React, { useState, useEffect } from "react";
import { 
  Copy, 
  Check, 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  Settings, 
  ChevronRight,
  Save,
  Undo,
  Info,
  Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const INITIAL_DATA = {
  id: 42,
  uid: "a7f3c91e-4b28-4d3e-9f81-2c0e5d7b3a16",
  created: "March 14, 2024",
  status: "Active",
  name: "TechLeads Pro",
  type: "Affiliate",
  postback_url: "https://techlead.example.com/postback?cid={click_id}&campaign={campaign_id}",
};

const TOKENS = [
  { token: "{click_id}", desc: "Unique click identifier" },
  { token: "{campaign_id}", desc: "Campaign ID" },
  { token: "{sub1}", desc: "Sub ID 1" },
  { token: "{sub2}", desc: "Sub ID 2" },
  { token: "{sub3}", desc: "Sub ID 3" },
  { token: "{sub4}", desc: "Sub ID 4" },
  { token: "{aff_id}", desc: "Affiliate ID" },
  { token: "{offer_id}", desc: "Offer ID" },
];

export function TwoColumnPanel() {
  const [data, setData] = useState(INITIAL_DATA);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  const isDirty = 
    data.status !== INITIAL_DATA.status ||
    data.name !== INITIAL_DATA.name ||
    data.type !== INITIAL_DATA.type ||
    data.postback_url !== INITIAL_DATA.postback_url;

  const handleCopy = (text: string, type: "id" | "uid") => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const isFieldDirty = (field: keyof typeof data) => data[field] !== INITIAL_DATA[field];

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Megaphone size={18} />
            </div>
            TrackMaster
          </div>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <LayoutDashboard size={18} />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md bg-indigo-50 text-indigo-700">
            <Users size={18} />
            Partners
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <Megaphone size={18} />
            Campaigns
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <Settings size={18} />
            Settings
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-6 shrink-0">
          <div className="flex items-center text-sm text-slate-500">
            <a href="#" className="hover:text-slate-900">Partners</a>
            <ChevronRight size={16} className="mx-1" />
            <span className="font-medium text-slate-900">{INITIAL_DATA.name}</span>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Left Column - Context */}
            <div className="w-full lg:w-[35%] shrink-0 flex flex-col gap-6 sticky top-0">
              <Card className="p-6 border-slate-200 shadow-sm rounded-xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                <div className="flex flex-col items-center text-center mt-2 mb-6">
                  <Avatar className="h-20 w-20 mb-4 border-2 border-slate-100">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-2xl font-semibold">
                      {INITIAL_DATA.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold text-slate-900">{INITIAL_DATA.name}</h2>
                  <div className="flex gap-2 mt-3">
                    <Badge variant={INITIAL_DATA.status === "Active" ? "default" : "secondary"} className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                      {INITIAL_DATA.status}
                    </Badge>
                    <Badge variant="outline" className="text-slate-600 bg-slate-50">
                      {INITIAL_DATA.type}
                    </Badge>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Created</p>
                    <p className="text-sm font-medium text-slate-900">{INITIAL_DATA.created}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Partner ID</p>
                    <div className="flex items-center justify-between group">
                      <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono">
                        {INITIAL_DATA.id}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-slate-400 group-hover:text-slate-600"
                        onClick={() => handleCopy(String(INITIAL_DATA.id), "id")}
                      >
                        {copiedId ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Partner UID</p>
                    <div className="flex items-center justify-between group">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono truncate mr-2 w-full">
                        {INITIAL_DATA.uid}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-slate-400 group-hover:text-slate-600 shrink-0"
                        onClick={() => handleCopy(INITIAL_DATA.uid, "uid")}
                      >
                        {copiedUid ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Editor */}
            <div className="w-full lg:w-[65%] flex flex-col pb-20">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-slate-400" />
                    Settings
                  </h3>
                </div>

                <div className="p-6 space-y-8">
                  
                  {/* Form Field: Name */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-start">
                    <Label htmlFor="name" className="text-sm font-medium text-slate-700 md:mt-2.5">
                      Partner Name
                    </Label>
                    <div className="md:col-span-3">
                      <div className="relative">
                        <Input 
                          id="name" 
                          value={data.name} 
                          onChange={(e) => setData({ ...data, name: e.target.value })}
                          className={`max-w-md ${isFieldDirty("name") ? "border-amber-400 ring-1 ring-amber-400/20" : ""}`}
                        />
                        {isFieldDirty("name") && (
                          <span className="absolute -right-2 top-0 transform translate-x-full h-full flex items-center">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 ml-2">Changed</Badge>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Form Field: Status & Type */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-start">
                    <Label className="text-sm font-medium text-slate-700 md:mt-2.5">
                      Account Status
                    </Label>
                    <div className="md:col-span-3 flex gap-4">
                      <div className="relative w-40">
                        <Select value={data.status} onValueChange={(val) => setData({ ...data, status: val })}>
                          <SelectTrigger className={isFieldDirty("status") ? "border-amber-400 ring-1 ring-amber-400/20" : ""}>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Paused">Paused</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Label className="text-sm font-medium text-slate-700">Type</Label>
                        <Select value={data.type} onValueChange={(val) => setData({ ...data, type: val })}>
                          <SelectTrigger className={`w-40 ${isFieldDirty("type") ? "border-amber-400 ring-1 ring-amber-400/20" : ""}`}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Affiliate">Affiliate</SelectItem>
                            <SelectItem value="Advertiser">Advertiser</SelectItem>
                            <SelectItem value="Network">Network</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Form Field: Postback URL */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-start">
                    <div>
                      <Label htmlFor="postback" className="text-sm font-medium text-slate-700">
                        Postback URL
                      </Label>
                      <p className="text-xs text-slate-500 mt-1">Fired on successful conversions.</p>
                    </div>
                    <div className="md:col-span-3">
                      <div className="relative">
                        <Input 
                          id="postback" 
                          value={data.postback_url} 
                          onChange={(e) => setData({ ...data, postback_url: e.target.value })}
                          className={`font-mono text-sm ${isFieldDirty("postback_url") ? "border-amber-400 ring-1 ring-amber-400/20" : ""}`}
                        />
                      </div>
                      
                      {/* Tokens Reference inline */}
                      <div className="mt-4 bg-slate-50 border border-slate-100 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                          <LinkIcon size={14} /> Available Tokens
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          {TOKENS.map((t) => (
                            <div key={t.token} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                              <code className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100 shrink-0">
                                {t.token}
                              </code>
                              <span className="text-xs text-slate-500 truncate">{t.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Sticky Save Bar */}
              {isDirty && (
                <div className="fixed bottom-6 right-6 lg:right-8 bg-white border border-slate-200 shadow-xl rounded-full px-4 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-8">
                  <div className="flex items-center gap-2 text-sm text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-full">
                    <Info size={16} />
                    Unsaved changes
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setData(INITIAL_DATA)}>
                      <Undo size={16} className="mr-2" />
                      Discard
                    </Button>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
                      <Save size={16} className="mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
