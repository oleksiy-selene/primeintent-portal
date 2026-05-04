import React, { useState } from "react";
import { 
  Building2, 
  Settings, 
  Copy, 
  Check, 
  Hash, 
  Calendar, 
  Fingerprint,
  Users,
  Megaphone,
  LayoutDashboard,
  Save,
  ChevronRight,
  ShieldAlert,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const INITIAL_DATA = {
  status: "Active",
  name: "TechLeads Pro",
  type: "Affiliate",
  postback_url: "https://techlead.example.com/postback?cid={click_id}&campaign={campaign_id}"
};

const READONLY_DATA = {
  partner_id: "42",
  partner_uid: "a7f3c91e-4b28-4d3e-9f81-2c0e5d7b3a16",
  created_at: "March 14, 2024"
};

const POSTBACK_TOKENS = [
  { token: "{click_id}", desc: "Unique click identifier" },
  { token: "{campaign_id}", desc: "ID of the campaign" },
  { token: "{sub1}", desc: "Sub-affiliate parameter 1" },
  { token: "{sub2}", desc: "Sub-affiliate parameter 2" },
  { token: "{sub3}", desc: "Sub-affiliate parameter 3" },
  { token: "{sub4}", desc: "Sub-affiliate parameter 4" },
  { token: "{aff_id}", desc: "Affiliate ID" },
  { token: "{offer_id}", desc: "Offer ID" },
];

export function SectionedCards() {
  const [formData, setFormData] = useState(INITIAL_DATA);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDirtyFields = () => {
    const dirty = [];
    if (formData.name !== INITIAL_DATA.name) dirty.push('name');
    if (formData.status !== INITIAL_DATA.status) dirty.push('status');
    if (formData.type !== INITIAL_DATA.type) dirty.push('type');
    if (formData.postback_url !== INITIAL_DATA.postback_url) dirty.push('postback_url');
    return dirty;
  };

  const dirtyFields = getDirtyFields();
  const isDirty = dirtyFields.length > 0;

  const isFieldDirty = (field: string) => dirtyFields.includes(field);

  return (
    <div className="flex h-[860px] w-[1280px] bg-slate-100 overflow-hidden font-sans border rounded-lg shadow-2xl">
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 font-bold text-white text-lg border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center mr-3 text-white">
            <Building2 size={20} />
          </div>
          NexusTrack
        </div>
        <div className="p-4 space-y-1 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 mt-4 px-2">Manage</div>
          <button className="w-full flex items-center px-2 py-2 text-sm rounded-md bg-indigo-500/10 text-indigo-400 font-medium">
            <Users size={18} className="mr-3" /> Partners
          </button>
          <button className="w-full flex items-center px-2 py-2 text-sm rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <Megaphone size={18} className="mr-3" /> Campaigns
          </button>
          <button className="w-full flex items-center px-2 py-2 text-sm rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <LayoutDashboard size={18} className="mr-3" /> Dashboard
          </button>
          
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 mt-8 px-2">System</div>
          <button className="w-full flex items-center px-2 py-2 text-sm rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <Settings size={18} className="mr-3" /> Settings
          </button>
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-white mr-3">
              AD
            </div>
            <div className="text-sm">
              <div className="text-white font-medium">Admin User</div>
              <div className="text-slate-500 text-xs">admin@nexus.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden">
        
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center px-8 flex-shrink-0 justify-between sticky top-0 z-10">
          <div className="flex items-center text-sm">
            <span className="text-slate-500 hover:text-slate-900 cursor-pointer transition-colors">Partners</span>
            <ChevronRight size={16} className="text-slate-400 mx-2" />
            <span className="font-semibold text-slate-900">{INITIAL_DATA.name}</span>
          </div>
          <div className="flex items-center space-x-4">
            {isDirty && (
              <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                Unsaved changes
              </Badge>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Partner Details</h1>
                <p className="text-slate-500 text-sm mt-1">Manage partner configuration and tracking settings.</p>
              </div>
            </div>

            {/* Identifiers Card */}
            <Card className="border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center">
                <ShieldAlert size={18} className="text-slate-400 mr-2" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600">Identifiers & System Info</h2>
              </div>
              <CardContent className="p-0">
                <div className="grid grid-cols-3 divide-x divide-slate-100">
                  <div className="p-6 bg-white">
                    <div className="text-xs font-medium text-slate-500 mb-1 flex items-center">
                      <Hash size={14} className="mr-1.5" /> Partner ID
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-semibold text-slate-900">{READONLY_DATA.partner_id}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => handleCopy(READONLY_DATA.partner_id, 'id')}>
                              {copiedId === 'id' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy ID</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-white">
                    <div className="text-xs font-medium text-slate-500 mb-1 flex items-center">
                      <Fingerprint size={14} className="mr-1.5" /> Unique Identifier
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-mono text-slate-900 truncate mr-2" title={READONLY_DATA.partner_uid}>
                        {READONLY_DATA.partner_uid.substring(0, 13)}...
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => handleCopy(READONLY_DATA.partner_uid, 'uid')}>
                              {copiedId === 'uid' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy full UID</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <div className="p-6 bg-white">
                    <div className="text-xs font-medium text-slate-500 mb-1 flex items-center">
                      <Calendar size={14} className="mr-1.5" /> Created Date
                    </div>
                    <div className="mt-2">
                      <span className="text-sm font-medium text-slate-900">{READONLY_DATA.created_at}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editable Settings Card */}
            <Card className="border-slate-200 shadow-sm relative">
              <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center rounded-t-xl">
                <Settings size={18} className="text-indigo-500 mr-2" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800">Configuration Settings</h2>
              </div>
              
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  
                  {/* Name Field */}
                  <div className="space-y-2 relative">
                    {isFieldDirty('name') && (
                      <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-md"></div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="name" className="text-slate-700 font-semibold">Partner Name</Label>
                      {isFieldDirty('name') && <Badge variant="secondary" className="h-5 text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-50">Modified</Badge>}
                    </div>
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`transition-colors ${isFieldDirty('name') ? 'border-indigo-200 bg-indigo-50/30 focus-visible:ring-indigo-500' : 'border-slate-300'}`}
                    />
                  </div>

                  {/* Status Field */}
                  <div className="space-y-2 relative">
                    {isFieldDirty('status') && (
                      <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-md"></div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="status" className="text-slate-700 font-semibold">Account Status</Label>
                      {isFieldDirty('status') && <Badge variant="secondary" className="h-5 text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-50">Modified</Badge>}
                    </div>
                    <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                      <SelectTrigger className={`transition-colors ${isFieldDirty('status') ? 'border-indigo-200 bg-indigo-50/30 focus:ring-indigo-500' : 'border-slate-300'}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">
                          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>Active</div>
                        </SelectItem>
                        <SelectItem value="Paused">
                          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>Paused</div>
                        </SelectItem>
                        <SelectItem value="Disabled">
                          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-rose-500 mr-2"></div>Disabled</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Type Field */}
                  <div className="space-y-2 relative">
                    {isFieldDirty('type') && (
                      <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-md"></div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="type" className="text-slate-700 font-semibold">Partner Type</Label>
                      {isFieldDirty('type') && <Badge variant="secondary" className="h-5 text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-50">Modified</Badge>}
                    </div>
                    <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                      <SelectTrigger className={`transition-colors ${isFieldDirty('type') ? 'border-indigo-200 bg-indigo-50/30 focus:ring-indigo-500' : 'border-slate-300'}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Affiliate">Affiliate</SelectItem>
                        <SelectItem value="Network">Network</SelectItem>
                        <SelectItem value="Agency">Agency</SelectItem>
                        <SelectItem value="Direct">Direct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </div>

                <Separator className="bg-slate-100" />

                {/* Postback URL Field */}
                <div className="space-y-4 relative">
                  {isFieldDirty('postback_url') && (
                    <div className="absolute -left-8 top-8 w-1 h-8 bg-indigo-500 rounded-r-md"></div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="postback" className="text-slate-700 font-semibold">Global Postback URL</Label>
                    {isFieldDirty('postback_url') && <Badge variant="secondary" className="h-5 text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-50">Modified</Badge>}
                  </div>
                  <Input 
                    id="postback" 
                    value={formData.postback_url} 
                    onChange={(e) => setFormData({...formData, postback_url: e.target.value})}
                    className={`font-mono text-sm transition-colors ${isFieldDirty('postback_url') ? 'border-indigo-200 bg-indigo-50/30 focus-visible:ring-indigo-500' : 'border-slate-300'}`}
                  />
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center text-sm font-semibold text-slate-700 mb-3">
                      <Info size={16} className="text-indigo-500 mr-2" /> Available URL Tokens
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {POSTBACK_TOKENS.map((t, i) => (
                        <div key={i} className="flex flex-col p-2 bg-white rounded border border-slate-100 shadow-sm">
                          <code className="text-xs font-semibold text-indigo-600 mb-1">{t.token}</code>
                          <span className="text-[10px] text-slate-500 leading-tight">{t.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </CardContent>

              {/* Action Footer (conditionally rendered or styled based on dirty state) */}
              <div className={`border-t transition-all duration-300 ${isDirty ? 'bg-indigo-50/50 border-indigo-100 p-6' : 'bg-slate-50 border-slate-100 p-6 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    {isDirty ? (
                      <p className="text-sm font-medium text-indigo-700 flex items-center">
                        <span className="flex h-5 w-5 bg-indigo-100 text-indigo-600 rounded-full items-center justify-center text-xs mr-2 font-bold">{dirtyFields.length}</span>
                        unsaved change{dirtyFields.length > 1 ? 's' : ''}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">All changes saved</p>
                    )}
                  </div>
                  <div className="space-x-3">
                    {isDirty && (
                      <Button variant="outline" className="border-slate-300" onClick={() => setFormData(INITIAL_DATA)}>
                        Discard
                      </Button>
                    )}
                    <Button 
                      disabled={!isDirty} 
                      className={isDirty ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200" : ""}
                    >
                      <Save size={16} className="mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>

            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
