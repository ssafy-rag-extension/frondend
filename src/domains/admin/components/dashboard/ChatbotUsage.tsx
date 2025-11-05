import { useEffect, useRef, useState } from 'react';
import Highcharts from 'highcharts';
import Card from '@/shared/components/Card';
import Select from '@/shared/components/Select';
import { getChatbotUsageTimeSeries } from '@/domains/admin/api/dashboard.api';
import type { chatbotUsageTime } from '@/domains/admin/types/dashboard.types';

export default function ChatbotUsage() {
  const chartRef = useRef<Highcharts.Chart | null>(null);
  const [data, setData] = useState<chatbotUsageTime | null>(null);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  // const [timeframe, setTimeframe] = useState<chatbotUsagetimeframe | null>(null);
  // const [items, setItems] = useState<chatbotUsageItems[] | null>(null);

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getChatbotUsageTimeSeries();
        setData(result);
        console.log('✅ 챗봇 사용량 시계열 데이터:', result);
      } catch (error) {
        console.error('❌ 챗봇 사용량 데이터 로드 실패:', error);
      }
    };
    fetchData();
  }, []);

  // 차트 초기화
  useEffect(() => {
    chartRef.current = Highcharts.chart('chatbot-usage-chart', {
      chart: {
        type: 'line',
        backgroundColor: 'transparent',
        height: 320,
        marginRight: 10,
        animation: true,
      },
      title: { text: '' },
      credits: { enabled: false },
      xAxis: {
        type: 'datetime',
        tickPixelInterval: 150,
        labels: { style: { fontSize: '11px', color: '#6B7280' } },
      },
      yAxis: {
        title: { text: '사용량 (토큰 수)' },
        min: 0,
        labels: { style: { color: '#6B7280' } },
      },
      tooltip: {
        xDateFormat: '%Y-%m-%d',
        pointFormat: '<b>{point.y}</b> 토큰',
      },
      plotOptions: {
        line: {
          color: '#EE5B01',
          lineWidth: 2,
          marker: { enabled: true, radius: 3 },
        },
      },
      series: [
        {
          type: 'line',
          name: '챗봇 사용량',
          color: '#EE5B01',
          data: [],
        },
      ],
    });
  }, []);

  // 기간별 데이터 반영 로직
  const updateChart = (type: 'daily' | 'weekly' | 'monthly') => {
    setPeriod(type);
    const chart = chartRef.current;
    if (!chart || !data) return;

    // timeframe, items 추출
    const { items } = data;

    // x축 라벨 포맷 & 단위 변경
    if (type === 'daily') {
      chart.xAxis[0].update({
        tickInterval: 24 * 3600 * 1000,
        labels: { format: '{value:%m/%d}', style: { fontSize: '11px', color: '#6B7280' } },
      });
      chart.yAxis[0].setTitle({ text: '일별 토큰 사용량' });
    } else if (type === 'weekly') {
      chart.xAxis[0].update({
        tickInterval: 7 * 24 * 3600 * 1000,
        labels: { format: '{value:%m/%d}', style: { fontSize: '11px', color: '#6B7280' } },
      });
      chart.yAxis[0].setTitle({ text: '주별 총 토큰 사용량' });
    } else {
      chart.xAxis[0].update({
        tickInterval: 30 * 24 * 3600 * 1000,
        labels: { format: '{value:%Y-%m}', style: { fontSize: '11px', color: '#6B7280' } },
      });
      chart.yAxis[0].setTitle({ text: '월별 총 토큰 사용량' });
    }

    // 실제 API 데이터 items 반영
    const seriesData = items.map((item) => [new Date(item.x).getTime(), item.y]);
    chart.series[0].setData(seriesData, true);
  };

  //  API 데이터 로드 이후 자동 반영
  useEffect(() => {
    if (data) {
      // granularity를 기준으로 자동 반영 (예: daily / weekly / monthly)
      updateChart(data.timeframe.granularity as 'daily' | 'weekly' | 'monthly');
    }
  }, [data]);

  return (
    <Card title="챗봇 사용량 추이" subtitle="일별, 주별, 월별 사용량 추이" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="ml-auto w-40">
          <Select
            value={period}
            onChange={(v) => updateChart(v as 'daily' | 'weekly' | 'monthly')}
            options={[
              { label: '일별', value: 'daily' },
              { label: '주별', value: 'weekly' },
              { label: '월별', value: 'monthly' },
            ]}
          />
        </div>
      </div>

      <div id="chatbot-usage-chart" className="w-full" />
    </Card>
  );
}
