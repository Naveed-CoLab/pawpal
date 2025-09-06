import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { 
  BehaviorTrendService, 
  BehaviorTrendData, 
  BehaviorDataPoint 
} from '@/lib/behaviorTrendService';
import { useAuth } from '@/hooks/useAuth';
import { usePets } from '@/hooks/useDatabase';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar,
  Heart,
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react-native';

interface BehaviorTrendChartProps {
  petId?: string;
  timeRange?: 7 | 14 | 30 | 90;
  onDataChange?: (data: BehaviorTrendData) => void;
  hideHeader?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;

export const BehaviorTrendChart: React.FC<BehaviorTrendChartProps> = ({
  petId: propPetId,
  timeRange = 30,
  onDataChange,
  hideHeader = false
}) => {
  const { user } = useAuth();
  const { pets } = usePets();
  const [trendData, setTrendData] = useState<BehaviorTrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [selectedMetric, setSelectedMetric] = useState<'overall' | 'mood' | 'health'>('overall');

  // Get pet ID (from props or primary pet)
  const petId = propPetId || pets.find(p => p.is_primary)?.id || pets[0]?.id;
  
  useEffect(() => {
    if (user?.id && petId) {
      fetchTrendData();
    }
  }, [user?.id, petId, selectedTimeRange]);

  const fetchTrendData = async () => {
    if (!user?.id || !petId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await BehaviorTrendService.getBehaviorTrend(
        user.id,
        petId,
        selectedTimeRange
      );
      
      setTrendData(data);
      onDataChange?.(data);
    } catch (err) {
      console.error('Error fetching behavior trend:', err);
      setError('Failed to load behavior trend data');
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!trendData || trendData.dataPoints.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [7],
          color: () => '#ffcc80',
          strokeWidth: 2
        }]
      };
    }

    // Filter to show only days with data for cleaner visualization
    const validPoints = trendData.dataPoints.filter(p => p.notes);
    
    if (validPoints.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [7],
          color: () => '#ffcc80',
          strokeWidth: 2
        }]
      };
    }

    // Take up to 10 most recent data points for better readability
    const displayPoints = validPoints.slice(-10);
    
    const labels = displayPoints.map(point => {
      const date = new Date(point.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const getMetricData = () => {
      switch (selectedMetric) {
        case 'mood':
          return displayPoints.map(p => p.moodScore);
        case 'health':
          return displayPoints.map(p => p.healthScore);
        default:
          return displayPoints.map(p => p.overallScore);
      }
    };

    const getMetricColor = () => {
      switch (selectedMetric) {
        case 'mood':
          return '#ff9d00'; // Orange for mood
        case 'health':
          return '#66bb6a'; // Green for health
        default:
          return '#ffb74d'; // Warm yellow for overall
      }
    };

    return {
      labels,
      datasets: [{
        data: getMetricData(),
        color: () => getMetricColor(),
        strokeWidth: 3
      }]
    };
  };

  const getTrendIcon = () => {
    if (!trendData) return <Minus size={20} color="#ffcc80" />;
    
    switch (trendData.insights.trend) {
      case 'improving':
        return <TrendingUp size={20} color="#66bb6a" />;
      case 'declining':
        return <TrendingDown size={20} color="#ff7043" />;
      default:
        return <Minus size={20} color="#ffb74d" />;
    }
  };

  const getTrendColor = () => {
    if (!trendData) return '#ffcc80';
    
    switch (trendData.insights.trend) {
      case 'improving':
        return '#66bb6a';
      case 'declining':
        return '#ff7043';
      default:
        return '#ffb74d';
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'mood':
        return <Brain size={16} color={selectedMetric === 'mood' ? '#fff8e1' : '#8d6e63'} />;
      case 'health':
        return <Heart size={16} color={selectedMetric === 'health' ? '#fff8e1' : '#8d6e63'} />;
      default:
        return <Activity size={16} color={selectedMetric === 'overall' ? '#fff8e1' : '#8d6e63'} />;
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#fff8e1', '#ffecb3']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff9d00" />
        <Text style={styles.loadingText}>Loading behavior trends...</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#fff8e1', '#ffecb3']} style={styles.errorContainer}>
        <AlertTriangle size={40} color="#ff7043" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTrendData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  if (!trendData || trendData.insights.totalEntries === 0) {
    return (
      <LinearGradient colors={['#fff8e1', '#ffecb3']} style={styles.emptyContainer}>
        <Activity size={40} color="#ffcc80" />
        <Text style={styles.emptyTitle}>No Behavior Data Yet</Text>
        <Text style={styles.emptySubtitle}>
          Start using Snap My Mood and Health Checker to see your pet's behavior trends
        </Text>
      </LinearGradient>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header - Only show if not hidden */}
      {!hideHeader && (
        <LinearGradient colors={['#fff8e1', '#ffecb3']} style={styles.header}>
          <View style={styles.titleContainer}>
            <Activity size={24} color="#ff9d00" />
            <Text style={styles.title}>Behavior Trends</Text>
          </View>
          <View style={styles.trendIndicator}>
            {getTrendIcon()}
            <Text style={[styles.trendText, { color: getTrendColor() }]}>
              {trendData.insights.trend}
            </Text>
          </View>
        </LinearGradient>
      )}

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {[7, 14, 30, 90].map((days) => (
          <TouchableOpacity
            key={days}
            style={[
              styles.timeRangeButton,
              selectedTimeRange === days && styles.timeRangeButtonActive
            ]}
            onPress={() => setSelectedTimeRange(days as any)}
          >
            <Text style={[
              styles.timeRangeButtonText,
              selectedTimeRange === days && styles.timeRangeButtonTextActive
            ]}>
              {days}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Metric Selector */}
      <View style={styles.metricContainer}>
        {(['overall', 'mood', 'health'] as const).map((metric) => (
          <TouchableOpacity
            key={metric}
            style={[
              styles.metricButton,
              selectedMetric === metric && styles.metricButtonActive
            ]}
            onPress={() => setSelectedMetric(metric)}
          >
            {getMetricIcon(metric)}
            <Text style={[
              styles.metricButtonText,
              selectedMetric === metric && styles.metricButtonTextActive
            ]}>
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart with Beautiful Gradient */}
      <View style={styles.chartContainer}>
        <LinearGradient
          colors={['#fffbf0', '#fff8e1']}
          style={styles.chartBackground}
        >
          <LineChart
            data={getChartData()}
            width={chartWidth}
            height={200}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: '#fffbf0',
              backgroundGradientFromOpacity: 0,
              backgroundGradientTo: '#fff8e1',
              backgroundGradientToOpacity: 0.1,
              decimalPlaces: 1,
              color: (opacity = 1) => {
                switch (selectedMetric) {
                  case 'mood':
                    return `rgba(255, 157, 0, ${opacity})`;
                  case 'health':
                    return `rgba(102, 187, 106, ${opacity})`;
                  default:
                    return `rgba(255, 183, 77, ${opacity})`;
                }
              },
              labelColor: (opacity = 1) => `rgba(141, 110, 99, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '5',
                strokeWidth: '3',
                stroke: '#fff8e1'
              },
              propsForLabels: {
                fontSize: 12,
                fontFamily: Fonts.body.regular
              },
              fillShadowGradientFrom: selectedMetric === 'mood' ? '#ff9d00' : 
                                     selectedMetric === 'health' ? '#66bb6a' : '#ffb74d',
              fillShadowGradientFromOpacity: 0.4,
              fillShadowGradientTo: '#fff8e1',
              fillShadowGradientToOpacity: 0.1,
              useShadowColorFromDataset: false,
            }}
            bezier
            style={styles.chart}
            withDots={true}
            withShadow={true}
            withInnerLines={false}
            withOuterLines={false}
            segments={4}
            withVerticalLines={false}
            withHorizontalLines={true}
            horizontalLabelRotation={0}
            yAxisInterval={1}
          />
        </LinearGradient>
      </View>

      {/* Insights Cards */}
      <View style={styles.insightsContainer}>
        <LinearGradient colors={['#fff8f0', '#fff8f0']} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Brain size={20} color="#ff9d00" />
            <Text style={styles.insightTitle}>Average Mood</Text>
          </View>
          <Text style={styles.insightValue}>
            {trendData.insights.avgMoodScore}/10
          </Text>
          <Text style={styles.insightSubtitle}>
            {trendData.insights.commonMoods[0]?.mood.replace('_', ' ') || 'No data'}
          </Text>
        </LinearGradient>

        <LinearGradient colors={['#fff8f0', '#fff8f0']} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Heart size={20} color="#66bb6a" />
            <Text style={styles.insightTitle}>Health Score</Text>
          </View>
          <Text style={styles.insightValue}>
            {trendData.insights.avgHealthScore}/10
          </Text>
          <Text style={styles.insightSubtitle}>
            {trendData.insights.healthAlerts > 0 
              ? `${trendData.insights.healthAlerts} alerts`
              : 'All good'
            }
          </Text>
        </LinearGradient>

        <LinearGradient colors={['#fff8f0', '#fff8f0']} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Calendar size={20} color="#ffb74d" />
            <Text style={styles.insightTitle}>Weekly Trend</Text>
          </View>
          <Text style={[
            styles.insightValue,
            { color: trendData.insights.lastWeekTrend >= 0 ? '#66bb6a' : '#ff7043' }
          ]}>
            {trendData.insights.lastWeekTrend >= 0 ? '+' : ''}{trendData.insights.lastWeekTrend}%
          </Text>
          <Text style={styles.insightSubtitle}>
            vs. previous week
          </Text>
        </LinearGradient>
      </View>

      {/* Common Moods */}
      {trendData.insights.commonMoods.length > 0 && (
        <View style={styles.moodsContainer}>
          <Text style={styles.moodsTitle}>Most Common Moods</Text>
          <View style={styles.moodsGrid}>
            {trendData.insights.commonMoods.map((moodData, index) => (
              <LinearGradient
                key={moodData.mood}
                colors={['#fff8e1', '#ffecb3']}
                style={styles.moodChip}
              >
                <Text style={styles.moodEmoji}>
                  {BehaviorTrendService.getMoodEmoji(moodData.mood)}
                </Text>
                <Text style={styles.moodName}>
                  {moodData.mood.replace('_', ' ')}
                </Text>
                <Text style={styles.moodCount}>
                  {moodData.count}x
                </Text>
              </LinearGradient>
            ))}
          </View>
        </View>
      )}

      {/* Summary */}
      <LinearGradient colors={['#fff4bb', '#fff4bb']} style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <Text style={styles.summaryText}>
          Over the last {selectedTimeRange} days, your pet shows a{' '}
          <Text style={{ color: getTrendColor(), fontFamily: Fonts.body.bold }}>
            {trendData.insights.trend}
          </Text>{' '}
          behavior trend with {trendData.insights.totalEntries} recorded entries.
          {trendData.insights.healthAlerts > 0 && (
            <Text style={{ color: '#ff7043' }}>
              {' '}There {trendData.insights.healthAlerts === 1 ? 'was' : 'were'}{' '}
              {trendData.insights.healthAlerts} health alert{trendData.insights.healthAlerts > 1 ? 's' : ''} during this period.
            </Text>
          )}
        </Text>
      </LinearGradient>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8e1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#ff7043',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ff9d00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff8e1',
    fontFamily: Fonts.body.semiBold,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    textTransform: 'capitalize',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffecb3',
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  timeRangeButtonActive: {
    backgroundColor: '#ff9d00',
    borderColor: '#ff9d00',
  },
  timeRangeButtonText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#47463e',
  },
  timeRangeButtonTextActive: {
    color: '#fff8e1',
  },
  metricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 15,
    gap: 8,
  },
  metricButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#ffecb3',
    borderWidth: 1,
    borderColor: '#ffe0b2',
    gap: 4,
  },
  metricButtonActive: {
    backgroundColor: '#ff9d00',
    borderColor: '#ff9d00',
  },
  metricButtonText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#47463e',
  },
  metricButtonTextActive: {
    color: '#fff8e1',
  },
  chartContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartBackground: {
    padding: 10,
  },
  chart: {
    borderRadius: 16,
  },
  insightsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  insightCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  insightTitle: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#47463e',
  },
  insightValue: {
    fontSize: 18,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
    marginBottom: 4,
  },
  insightSubtitle: {
    fontSize: 10,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    textTransform: 'capitalize',
  },
  moodsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  moodsTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
    marginBottom: 12,
  },
  moodsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  moodChip: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 80,
  },
  moodEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  moodName: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#47463e',
    textAlign: 'center',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  moodCount: {
    fontSize: 10,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
  },
  summaryContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderColor: '#f5d982',
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    lineHeight: 20,
  },
}); 