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
  X,
  Check,
  Lock,
  Plus
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
import { cn } from "@/lib/utils";

const TOKENS = [
  { token: '{click_id}', desc: 'Unique click ID' },
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

const MOCK_CAMPAIGNS = [
  { id: 1, name: "Q2 Search Push", status: "active", created: "Apr 2 2024" },
  { id: 2, name: "Retargeting Flow", status: "paused", created: "Jan 15 2024" },
  { id: 3, name: "Brand Awareness", status: "active", created: "Nov 8 2023" },
];

export function CompactRefined2() {
  const [data, setData] = useState(INITIAL_DATA);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details'|'campaigns'>('details');

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

  const ReadOnlyRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="flex items-start py-4 px-6 border-b border-slate-100 bg-white hover:bg-slate-50/50 transition-colors border-l-[3px] border-transparent">
      <div className="w-[200px] shrink-0 pt-2 text-sm font-medium text-slate-400 flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-slate-300" />
        {label}
      </div>
      <div className="flex-1 max-w-2xl">
        {children}
      </div>
    </div>
  );

  const EditableRow = ({ 
    label, 
    dirty,
    children 
  }: { 
    label: string, 
    dirty?: boolean,
    children: React.ReactNode 
  }) => (
    <div className={cn(
      "flex items-start py-4 px-6 border-b border-slate-100 transition-colors",
      dirty ? "bg-indigo-50/30 border-l-[3px] border-l-indigo-500" : "bg-white hover:bg-slate-50/50 border-l-[3px] border-l-transparent"
    )}>
      <div className="w-[200px] shrink-0 pt-2 text-sm font-medium text-slate-500 flex items-center gap-2">
        {label}
      </div>
      <div className="flex-1 max-w-2xl">
        {children}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
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
        <header className="h-24 border-b border-slate-200 px-8 flex flex-col justify-center shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Home className="w-3.5 h-3.5" />
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Partners</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-medium">#{data.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">{INITIAL_DATA.name}</h1>
            <Badge variant="outline" className={cn(
              "rounded-sm font-medium uppercase tracking-wider text-xs border-0",
              data.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            )}>
              {data.status}
            </Badge>
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="px-8 py-4 border-b border-slate-100 bg-white">
          <div className="inline-flex items-center p-1 bg-slate-100/80 rounded-full">
            <button 
              onClick={() => setActiveTab('details')}
              className={cn(
                "px-5 py-1.5 text-sm font-medium rounded-full transition-all duration-200",
                activeTab === 'details' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              )}
            >
              Details
            </button>
            <button 
              onClick={() => setActiveTab('campaigns')}
              className={cn(
                "px-5 py-1.5 text-sm font-medium rounded-full transition-all duration-200",
                activeTab === 'campaigns' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              )}
            >
              Campaigns
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-16">
          <div className="max-w-4xl py-6">
            
            {activeTab === 'details' ? (
              <div className="border-y border-slate-200 bg-white">
                <div className="px-6 py-2 text-[10px] text-slate-300 font-medium uppercase tracking-widest flex items-center gap-4">
                  <span>───</span> Read-only <span>───</span>
                </div>
                
                {/* Read Only Identifiers */}
                <ReadOnlyRow label="Partner ID">
                  <div className="flex items-center gap-2 py-2">
                    <span className="font-mono text-sm text-slate-700">{data.id}</span>
                    <button 
                      onClick={() => handleCopy(data.id.toString(), 'id')}
                      className="p-1 rounded-sm text-slate-400 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                      title="Copy Partner ID"
                    >
                      {copied === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </ReadOnlyRow>

                <ReadOnlyRow label="Partner UID">
                  <div className="flex items-center gap-2 py-2">
                    <span className="font-mono text-sm text-slate-700">{data.uid}</span>
                    <button 
                      onClick={() => handleCopy(data.uid, 'uid')}
                      className="p-1 rounded-sm text-slate-400 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                      title="Copy Partner UID"
                    >
                      {copied === 'uid' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </ReadOnlyRow>

                <ReadOnlyRow label="Created Date">
                  <div className="py-2 text-sm text-slate-700">{data.created}</div>
                </ReadOnlyRow>

                <div className="px-6 py-2 mt-4 text-[10px] text-slate-300 font-medium uppercase tracking-widest flex items-center gap-4">
                  <span>───</span> Editable <span>───</span>
                </div>

                {/* Editable Fields */}
                <EditableRow label="Status" dirty={isFieldDirty('status')}>
                  <Select value={data.status} onValueChange={(v) => setData({...data, status: v})}>
                    <SelectTrigger className={cn("w-[240px]", isFieldDirty('status') && "border-indigo-300 ring-2 ring-indigo-100")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </EditableRow>

                <EditableRow label="Name" dirty={isFieldDirty('name')}>
                  <Input 
                    value={data.name} 
                    onChange={(e) => setData({...data, name: e.target.value})}
                    className={cn("max-w-[400px]", isFieldDirty('name') && "border-indigo-300 ring-2 ring-indigo-100")}
                  />
                </EditableRow>

                <EditableRow label="Partner Type" dirty={isFieldDirty('type')}>
                  <Select value={data.type} onValueChange={(v) => setData({...data, type: v})}>
                    <SelectTrigger className={cn("w-[240px]", isFieldDirty('type') && "border-indigo-300 ring-2 ring-indigo-100")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="affiliate">Affiliate</SelectItem>
                      <SelectItem value="advertiser">Advertiser</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                    </SelectContent>
                  </Select>
                </EditableRow>

                <EditableRow label="Postback URL" dirty={isFieldDirty('postback')}>
                  <div className="space-y-4">
                    <Input 
                      value={data.postback} 
                      onChange={(e) => setData({...data, postback: e.target.value})}
                      className={cn("font-mono text-sm", isFieldDirty('postback') && "border-indigo-300 ring-2 ring-indigo-100")}
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
                </EditableRow>
              </div>
            ) : (
              <div className="px-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Campaigns</h2>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md">
                    <Plus className="w-4 h-4 mr-2" /> New Campaign
                  </Button>
                </div>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-6 py-3">Campaign</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MOCK_CAMPAIGNS.map(camp => (
                        <tr key={camp.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-medium text-slate-900">{camp.name}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                              camp.status === 'active' ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"
                            )}>
                              {camp.status === 'active' ? 'Active' : 'Paused'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">{camp.created}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Fixed Save Action Bar */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-14 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-8 transition-transform duration-300 z-50",
          isDirty ? "translate-y-0" : "translate-y-full"
        )}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
            <span className="text-sm font-medium text-slate-200">{dirtyCount} changes pending</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleReset} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Revert
            </button>
            <Button size="sm" onClick={handleSave} className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-md h-8 px-5 font-semibold">
              Save
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