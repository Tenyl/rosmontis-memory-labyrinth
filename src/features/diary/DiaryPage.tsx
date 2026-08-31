import { PageHeader } from '../../components/PageHeader';
import { DiaryPanel } from './DiaryPanel';

export default function DiaryPage() {
  return (
    <section className="route-page diary-route" aria-labelledby="diary-page-title">
      <PageHeader
        id="diary-page-title"
        code="03"
        title="迷迭香手记"
        description="查看迷迭香留下的手记并添加博士批注。"
        meta="LOCAL DIARY / INDEXEDDB"
      />
      <DiaryPanel />
    </section>
  );
}
