import { useQuery } from '@tanstack/react-query';
import { AlertCircle, DollarSign, ExternalLink, FileText, TrendingUp, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportData {
  title?: string;
  metrics?: {
    totalUsers: number;
    newUsers: number;
    totalVolume: number;
    totalRevenue: number;
  };
  reportUrl: string;
}

interface ReportCardProps {
  title: string;
  dateRange: string;
  language: 'en' | 'es';
  startDate: string;
  endDate: string;
  t: (key: string) => string;
}

export default function ReportCard({
  title,
  dateRange,
  language,
  startDate,
  endDate,
  t,
}: ReportCardProps) {
  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useQuery<ReportData>({
    queryKey: ['dccReport', startDate, endDate, language],
    queryFn: async () => {
      // Report generation endpoint is not available in standalone mode
      throw new Error('Monthly report generation is not available without a backend service');
    },
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    retry: 1,
  });

  const formatNumber = (num: number | undefined) => {
    if (!num && num !== 0) return 'N/A';
    return num.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-red-200">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{title}</strong>
              <br />
              {error instanceof Error ? error.message : 'Unknown error'}
            </AlertDescription>
          </Alert>
          <Button className="w-full mt-4" onClick={() => refetch()} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            {t('tryAgain')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!reportData) {
    return (
      <Card className="border-2 border-red-200">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t('tryAgain')}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {reportData.title || title}
            </h4>
            <p className="text-sm text-gray-600 mt-1">{dateRange}</p>
            <Badge variant="outline" className="mt-2">
              {language === 'en' ? '🇺🇸 English' : '🇪🇸 Español'}
            </Badge>
          </div>
        </div>

        {/* Metrics Summary */}
        {reportData.metrics && (
          <div className="grid grid-cols-2 gap-3 bg-blue-50 rounded-lg p-4 mb-4">
            <div>
              <p className="text-xs text-gray-600">{t('totalUsers')}</p>
              <p className="text-lg font-bold text-blue-700 flex items-center gap-1">
                <Users className="w-4 h-4" />
                {formatNumber(reportData.metrics.totalUsers)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">{t('newUsers')}</p>
              <p className="text-lg font-bold text-green-700 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {formatNumber(reportData.metrics.newUsers)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">{t('totalVolume')}</p>
              <p className="text-lg font-bold text-purple-700">
                {formatNumber(reportData.metrics.totalVolume)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">{t('totalRevenue')}</p>
              <p className="text-lg font-bold text-indigo-700 flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {formatNumber(reportData.metrics.totalRevenue)}
              </p>
            </div>
          </div>
        )}

        {/* View Report Button */}
        <a href={reportData?.reportUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('viewFullReport')}
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}
