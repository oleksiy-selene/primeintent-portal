import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/_shared/AppLayout";
import { Header } from "@/components/_shared/Header";
import { DateRangePicker, type DateRange } from "@/components/_shared/DateRangePicker";
import { SortableHeader } from "@/components/SortableHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatDate, formatTime, usd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/useInfiniteScroll";
import { useSortState } from "@/lib/useSortState";
import { Filter, Search, Edit2 } from "lucide-react";

export default function Partners() {
  const { profile } = useAuth();
  const [location, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>(() => ({ from: null, to: null }));
  const { sortKey, sortDir, toggleSort, resetSort } = useSortState("created_at", "desc");

  const rows = [];

  return (
    <AppLayout>
      <Header title="Partners" subtitle="Manage partner records" />
      <div className="flex-1 p-8 min-h-0 flex flex-col gap-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search partners..." className="pl-9 bg-white" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[220px] bg-white"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>
    </AppLayout>
  );
}
