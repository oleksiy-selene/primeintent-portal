import React, { useState } from 'react';
import { 
  Building2, 
  ChevronRight, 
  Copy, 
  Home,
  LayoutDashboard,
  Megaphone,
  Save,
  Settings,
  Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const TOKENS = [
  { token: '{click_id}', desc: 'Unique click identifier' },
  { token: '{campaign_id}', desc: 'Campaign ID' },
  { token: '{sub1}', desc: 'Custom sub-parameter 1' },
  { token: '{sub2}', desc: 'Custom sub-parameter 2' },
  { token: '{sub3}', desc: 'Custom sub-parameter 3' },
  { token: '{sub4}', desc: 'Custom sub-parameter 4' },
  { token: '{aff_id}', desc: 'Affiliate ID' },
  { token: '{offer_id}', desc: 'Offer ID' },
];

const INITIAL_DATA = {
  id: 42,
  uid: 'a7f3c91e-4b28-4d3e-9f81-2c0e5d7b3a16',
  created: 'March 14, 2024',
  status: 'active',
  name: 'TechLeads Pro',
  type: 'affiliate',
  postback: 'https://techlead.example.com/postback?cid={click_id}&campaign={campaign_id}',
};

const SAMPLE_CAMPAIGNS = [
  { name: 'Q2 Search Push', status: 'Active', created: 'Apr 2 2024' },
  { name: 'Retargeting Flow', status: 'Paused', created: 'Jan 15 2024' },
  { name: 'Brand Awareness', status: 'Active', created: 'Nov 8 2023' }
];

export function CompactRefined1() {
  const [data, setData] = useState(INITIAL_DATA);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'campaigns'>('details');

  const isDirty = 
    data.status !== INITIAL_DATA.status ||
    data.name !== INITIAL_DATA.name ||
    data.type !== INITIAL_DATA.type ||
    data.postback !== INITIAL_DATA.postback;

  const dirtyCount = [
    data.status !== INITIAL_DATA.status,
    data.name !== INITIAL_DATA.name,
    data.type !== INITIAL_DATA.type,
    data.postback !== INITIAL_DATA.postback
  ].filter(Boolean).length;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = () => {
    alert('Changes saved!');
  };

  const handleReset = () => {
    setData(INITIAL_DATA);
  };

  const isFieldDirty = (field: keyof typeof INITIAL_DATA) => data[field] !== INITIAL_DATA[field];

  const FieldRow = ({ 
    label, 
    dirty,
    readOnly,
    children 
  }: { 
    label: string, 
    dirty?: boolean,
    readOnly?: boolean,
    children: React.ReactNode 
  }) => (
    <div className={cn(
      "flex items-start py-4 px-8 border-b border-slate-100 transition-colors group",
      dirty ? "bg-amber-50/50" : (readOnly ? "bg-slate-50" : "hover:bg-slate-50/50")
    )}>
      <div className="w-[200px] shrink-0 pt-2 text-sm font-medium text-slate-500 flex items-center gap-2">
        {label}
        {dirty && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
      </div>
      <div className="flex-1 max-w-2xl">
        {children}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-white font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-semibold">
            <div className="w-8 h-8 rounded bg-indigo-500 flex items-center justify-center text-white">
              <ActivityIcon />
            </div>
            TrackMaster
          </div>
        </div>
        <div className="p-4 space-y-1 flex-1">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Menu</div>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <Megaphone className="w-4 h-4" /> Campaigns
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-indigo-500/10 text-indigo-400 font-medium">
            <Building2 className="w-4 h-4" /> Partners
          </button>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* Header */}
        <header className="pt-6 px-8 shrink-0 flex flex-col">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Home className="w-3.5 h-3.5" />
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Partners</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-medium">#{data.id}</span>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">{INITIAL_DATA.name}</h1>
            <Badge variant="outline" className={cn(
              "rounded-sm font-medium uppercase tracking-wider text-xs border-0 shrink-0",
              data.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            )}>
              {data.status}
            </Badge>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-slate-200">
            <button 
              className={cn(
                "pb-3 text-sm font-medium transition-colors border-b-2",
                activeTab === 'details' 
                  ? "border-indigo-500 text-indigo-600" 
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button 
              className={cn(
                "pb-3 text-sm font-medium transition-colors border-b-2",
                activeTab === 'campaigns' 
                  ? "border-indigo-500 text-indigo-600" 
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
              onClick={() => setActiveTab('campaigns')}
            >
              Campaigns
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' ? (
            <div className="pb-24">
              <div className="border-b border-slate-200">
                {/* Read Only Identifiers */}
                <FieldRow label="Partner ID" readOnly>
                  <div className="flex items-center gap-2 py-2">
                    <span className="font-mono text-sm text-slate-700">{data.id}</span>
                    <button 
                      onClick={() => handleCopy(data.id.toString(), 'id')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                      title="Copy ID"
                    >
                      {copied === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </FieldRow>

                <FieldRow label="Partner UID" readOnly>
                  <div className="flex items-center gap-2 py-2">
                    <span className="font-mono text-sm text-slate-700">{data.uid}</span>
                    <button 
                      onClick={() => handleCopy(data.uid, 'uid')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                      title="Copy UID"
                    >
                      {copied === 'uid' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </FieldRow>

                <FieldRow label="Created Date" readOnly>
                  <div className="py-2 text-sm text-slate-700">{data.created}</div>
                </FieldRow>
              </div>

              {/* Divider */}
              <div className="px-8 py-3 bg-white border-b border-slate-100 flex items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settings</span>
                <div className="h-px bg-slate-100 flex-1 ml-4" />
              </div>

              {/* Editable Fields */}
              <div className="border-b border-slate-200">
                <FieldRow label="Status" dirty={isFieldDirty('status')}>
                  <Select value={data.status} onValueChange={(v) => setData({...data, status: v})}>
                    <SelectTrigger className={cn("w-[240px]", isFieldDirty('status') && "border-amber-300 bg-amber-50/30 focus:ring-amber-500")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>

                <FieldRow label="Name" dirty={isFieldDirty('name')}>
                  <Input 
                    value={data.name} 
                    onChange={(e) => setData({...data, name: e.target.value})}
                    className={cn("max-w-[400px]", isFieldDirty('name') && "border-amber-300 bg-amber-50/30 focus-visible:ring-amber-500")}
                  />
                </FieldRow>

                <FieldRow label="Partner Type" dirty={isFieldDirty('type')}>
                  <Select value={data.type} onValueChange={(v) => setData({...data, type: v})}>
                    <SelectTrigger className={cn("w-[240px]", isFieldDirty('type') && "border-amber-300 bg-amber-50/30 focus:ring-amber-500")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="affiliate">Affiliate</SelectItem>
                      <SelectItem value="advertiser">Advertiser</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>

                <FieldRow label="Postback URL" dirty={isFieldDirty('postback')}>
                  <div className="space-y-4 py-2">
                    <Input 
                      value={data.postback} 
                      onChange={(e) => setData({...data, postback: e.target.value})}
                      className={cn("font-mono text-sm", isFieldDirty('postback') && "border-amber-300 bg-amber-50/30 focus-visible:ring-amber-500")}
                    />
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Available Tokens</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {TOKENS.map(t => (
                          <div key={t.token} className="flex items-center gap-2 text-sm">
                            <code className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">{t.token}</code>
                            <span className="text-slate-500 text-xs">{t.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </FieldRow>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SAMPLE_CAMPAIGNS.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-slate-900">{c.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "rounded-sm uppercase tracking-wider text-[10px] border-0",
                            c.status === 'Active' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          )}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">{c.created}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Save Action Bar */}
        <div className={cn(
          "w-full bg-white border-t border-slate-200 flex items-center justify-between px-8 transition-all duration-300 ease-in-out shrink-0",
          isDirty ? "h-16 opacity-100" : "h-0 opacity-0 overflow-hidden border-t-0"
        )}>
          <div className="flex items-center gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
              {dirtyCount}
            </span>
            <span className="text-sm font-medium text-slate-700">Unsaved changes</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleReset} className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              Discard
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
