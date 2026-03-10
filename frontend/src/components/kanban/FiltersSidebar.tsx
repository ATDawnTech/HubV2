import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Search, Filter, X, Calendar as CalendarIcon, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface FilterState {
  search: string;
  stages: string[];
  sources: string[];
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

interface Stage {
  id: string;
  name: string;
  order: number;
  isTerminal?: boolean;
}

interface FiltersSidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  stages: Stage[];
  sources: string[];
  totalCandidates: number;
  filteredCount: number;
}

export const FiltersSidebar: React.FC<FiltersSidebarProps> = ({
  filters,
  onFiltersChange,
  stages,
  sources,
  totalCandidates,
  filteredCount
}) => {
  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      stages: [],
      sources: [],
      dateRange: {}
    });
  };

  const removeStageFilter = (stageId: string) => {
    onFiltersChange({
      ...filters,
      stages: filters.stages.filter(id => id !== stageId)
    });
  };

  const removeSourceFilter = (source: string) => {
    onFiltersChange({
      ...filters,
      sources: filters.sources.filter(s => s !== source)
    });
  };

  const hasActiveFilters = filters.search || filters.stages.length > 0 || filters.sources.length > 0 || filters.dateRange.from || filters.dateRange.to;

  return (
    <div className="w-80 border-r bg-muted/5 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Filter className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Filters</h3>
            <p className="text-sm text-muted-foreground">
              {filteredCount} of {totalCandidates} candidates
            </p>
          </div>
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All Filters
          </Button>
        )}
      </div>

      {/* Filters Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Search Filter */}
        <Card className="border-none shadow-none bg-background/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Input
              placeholder="Search candidates..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="h-9"
            />
          </CardContent>
        </Card>

        {/* Stage Filter */}
        <Card className="border-none shadow-none bg-background/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Stages
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {stages.map((stage) => (
              <div key={stage.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`stage-${stage.id}`}
                  checked={filters.stages.includes(stage.id)}
                  onCheckedChange={(checked) => {
                    const newStages = checked
                      ? [...filters.stages, stage.id]
                      : filters.stages.filter(id => id !== stage.id);
                    onFiltersChange({ ...filters, stages: newStages });
                  }}
                />
                <Label
                  htmlFor={`stage-${stage.id}`}
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {stage.name}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sources Filter */}
        {sources.length > 0 && (
          <Card className="border-none shadow-none bg-background/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {sources.slice(0, 10).map((source) => (
                <div key={source} className="flex items-center space-x-2">
                  <Checkbox
                    id={`source-${source}`}
                    checked={filters.sources.includes(source)}
                    onCheckedChange={(checked) => {
                      const newSources = checked
                        ? [...filters.sources, source]
                        : filters.sources.filter(s => s !== source);
                      onFiltersChange({ ...filters, sources: newSources });
                    }}
                  />
                  <Label
                    htmlFor={`source-${source}`}
                    className="text-sm font-normal cursor-pointer flex-1 truncate"
                    title={source}
                  >
                    {source}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Date Range Filter */}
        <Card className="border-none shadow-none bg-background/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Date Range
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !filters.dateRange.from && "text-muted-foreground"
                  )}
                >
                  {filters.dateRange.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                        {format(filters.dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(filters.dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange.from}
                  selected={filters.dateRange.from && filters.dateRange.to ? 
                    { from: filters.dateRange.from, to: filters.dateRange.to } : undefined}
                  onSelect={(range) => onFiltersChange({ ...filters, dateRange: range || {} })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Active Filters */}
        {hasActiveFilters && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Active Filters</h4>
              <div className="flex flex-wrap gap-2">
                {filters.stages.map((stageId) => {
                  const stage = stages.find(s => s.id === stageId);
                  return stage ? (
                    <Badge
                      key={stageId}
                      variant="secondary"
                      className="text-xs flex items-center gap-1"
                    >
                      {stage.name}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeStageFilter(stageId)}
                      />
                    </Badge>
                  ) : null;
                })}
                {filters.sources.map((source) => (
                  <Badge
                    key={source}
                    variant="secondary"
                    className="text-xs flex items-center gap-1"
                  >
                    {source}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeSourceFilter(source)}
                    />
                  </Badge>
                ))}
                {filters.dateRange.from && (
                  <Badge
                    variant="secondary"
                    className="text-xs flex items-center gap-1"
                  >
                    Date: {format(filters.dateRange.from, "MMM dd")}
                    {filters.dateRange.to && ` - ${format(filters.dateRange.to, "MMM dd")}`}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => onFiltersChange({ ...filters, dateRange: {} })}
                    />
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};