import PageHeader from '@/domains/admin/components/dashboard/PageHeader';
import NumberBoard from '@/domains/admin/components/dashboard/NumberBoard';
import ChatbotUsage from '@/domains/admin/components/dashboard/ChatbotUsage';
import ModelInfo from '@/domains/admin/components/dashboard/ModelInfo';
import MonthlyUsage from '@/domains/admin/components/dashboard/MonthlyUsage';

export default function Dashboard() {
  return (
    <section>
      <PageHeader />
      <NumberBoard />
      <ChatbotUsage />
      <ModelInfo />
      <MonthlyUsage />
    </section>
  );
}
