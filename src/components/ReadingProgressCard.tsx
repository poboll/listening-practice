"use client";

import { useState } from 'react';
import { ReadingProgress, useReadingProgress } from '@/contexts/ReadingProgressContext';
import { useFileContext } from '@/contexts/FileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { FileText, Clock, MoreVertical, Play, Trash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ReadingProgressCard() {
  const { recentReadings, clearReadingHistory } = useReadingProgress();
  const { selectFile } = useFileContext();
  const [expanded, setExpanded] = useState(false);

  // 继续阅读
  const continueReading = (reading: ReadingProgress) => {
    // 查找文件并选择
    selectFile({
      name: reading.fileName,
      path: reading.filePath,
      isDirectory: false,
      type: 'pdf'
    });
  };

  // 格式化上次阅读时间
  const formatLastRead = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
    } catch (e) {
      return '未知时间';
    }
  };

  if (recentReadings.length === 0) {
    return null;
  }

  const displayReadings = expanded
    ? recentReadings
    : recentReadings.slice(0, 3);

  return (
    <Card className="shadow-sm border-border/40">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">最近阅读</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={clearReadingHistory} className="text-red-500">
                <Trash className="h-4 w-4 mr-2" />
                清除所有记录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>继续上次的阅读进度</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {displayReadings.map((reading, index) => (
            <div key={reading.filePath + index} className="group relative">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-md bg-blue-50 dark:bg-blue-950 flex items-center justify-center mt-1">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{reading.fileName}</h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <Clock className="h-3 w-3" />
                    {formatLastRead(reading.lastReadAt)}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={reading.completionPercentage} className="h-1 flex-1" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {Math.round(reading.completionPercentage)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    第 {reading.currentPage} 页，共 {reading.totalPages} 页
                  </div>
                </div>
                <Button
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => continueReading(reading)}
                >
                  <Play className="h-4 w-4 mr-1" />
                  继续
                </Button>
              </div>
            </div>
          ))}
        </div>
        {recentReadings.length > 3 && (
          <Button
            variant="ghost"
            className="w-full mt-3 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '收起' : `显示更多 (${recentReadings.length - 3})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
} 