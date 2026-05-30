import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GradeBadge } from './grade-badge';

interface ScoreCardProps {
  title: string;
  score: number;
  grade: string;
  description?: string;
  showProgress?: boolean;
}

export function ScoreCard({ title, score, grade, description, showProgress = true }: ScoreCardProps) {
  const getProgressColor = () => {
    if (score >= 95) return 'bg-green-600';
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          <GradeBadge grade={grade} size="lg" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{score.toFixed(2)}%</span>
          </div>
          {showProgress && (
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getProgressColor()}`}
                style={{ width: `${Math.min(score, 100)}%` }}
              />
            </div>
          )}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
