import { Cpu, Gauge, HardDrive, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import Card from '@/shared/components/Card';

function ProgressBar({ value, color = 'bg-emerald-500' }: { value: number; color?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="h-2 w-full rounded-full bg-gray-200">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${v}%` }} />
    </div>
  );
}

function StatCardContent({
  value,
  suffix,
  footer,
  barValue,
  barColor = 'bg-emerald-500',
}: {
  value: string | number;
  suffix?: string;
  footer?: string;
  barValue?: number;
  barColor?: string;
}) {
  return (
    <>
      <div className="text-3xl font-semibold text-gray-900">
        {value}
        {suffix && <span className="ml-1 text-lg font-medium text-gray-500">{suffix}</span>}
      </div>

      {typeof barValue === 'number' && (
        <div className="mt-3">
          <ProgressBar value={barValue} color={barColor} />
        </div>
      )}

      {footer && <div className="mt-3 text-xs text-gray-500">{footer}</div>}
    </>
  );
}

export default function OverviewStats() {
  const stats: Array<{
    title: string;
    subtitle?: string;
    value: string | number;
    suffix?: string;
    icon: ReactNode;
    iconBg?: string;
    footer?: string;
    barValue?: number;
    barColor?: string;
  }> = [
    {
      title: '시스템 가동률',
      subtitle: '30일 평균',
      value: '99.9',
      suffix: '%',
      icon: <Gauge size={22} className="text-[#A35FD3]" />,
      iconBg: 'bg-gradient-to-r from-[#EED8F3]/70 to-[#CBE1FF]/70',
      footer: 'SLA 목표: 99.5%',
      barValue: 99.9,
      barColor: 'bg-emerald-500',
    },
    {
      title: 'CPU 사용률',
      subtitle: '평균',
      value: 78,
      suffix: '%',
      icon: <Cpu size={22} className="text-[#5A8CFF]" />,
      iconBg: 'bg-gradient-to-r from-[#E3EDFF]/70 to-[#CBE1FF]/70',
      footer: '8 코어 사용 중',
      barValue: 78,
      barColor: 'bg-amber-500',
    },
    {
      title: '메모리 사용량',
      subtitle: 'RAM',
      value: 3.8,
      suffix: 'GB',
      icon: <HardDrive size={22} className="text-[#8B5CF6]" />,
      iconBg: 'bg-gradient-to-r from-white to-[#EDE9FE]/70',
      footer: '총 8GB 중 47% 사용',
      barValue: 47,
      barColor: 'bg-emerald-500',
    },
    {
      title: '네트워크',
      subtitle: '트래픽',
      value: '103.3',
      suffix: 'Mbps IN',
      icon: <Wifi size={22} className="text-[#F97316]" />,
      iconBg: 'bg-gradient-to-r from-[#FFF7ED]/80 to-white',
      footer: '대역폭: 1Gbps',
    },
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <Card
          key={i}
          title={s.title}
          subtitle={s.subtitle}
          icon={s.icon}
          iconBg={s.iconBg}
          className="p-4"
        >
          <div className="mt-6">
            <StatCardContent
              value={s.value}
              suffix={s.suffix}
              footer={s.footer}
              barValue={s.barValue}
              barColor={s.barColor}
            />
          </div>
        </Card>
      ))}
    </section>
  );
}
