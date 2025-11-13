import { useEffect, useMemo, useState } from 'react';
import type { Option } from '@/shared/components/Select';
import { QuerySettingsForm } from '@/domains/admin/components/rag-settings/query/QuerySettingsForm';
import TemplateList from '@/domains/admin/components/rag-settings/TemplateList';
import type { RagOptions } from '@/domains/admin/components/rag-settings/options';
import type { FlowStepId } from '@/shared/components/rag-pipeline/PipelineFlow';

import {
  getQueryTemplates,
  getQueryTemplateDetail,
  putQueryTemplate,
  mapQueryTemplatesToOptions,
  createQueryTemplate,
} from '@/domains/admin/api/rag-settings/query-templates.api';
import type { QueryTemplateDetailResult } from '@/domains/admin/types/rag-settings/templates.types';

import {
  bool,
  isGenerationParams,
  isHybridParams,
  isSemanticParams,
  num,
} from '@/domains/admin/utils/ragParsers';

export type QueryPreset = {
  template: string;
  queryEngine: string;
  searchAlgorithm: string;
  topK: number;
  threshold: number;
  reranking: string;
  llmModel: string;
  temperature: number;
  multimodal: boolean;
  isDefault: boolean;
};

type Props = {
  anchors: Partial<Record<FlowStepId, React.RefObject<HTMLDivElement>>>;
  ragOptions: RagOptions | null;
  optionsLoading: boolean;
  onRequestDelete: (id: string) => void;
  onCreate: () => void;
};

export default function QueryTab({
  anchors,
  ragOptions,
  optionsLoading,
  onRequestDelete,
  onCreate,
}: Props) {
  const [templateId, setTemplateId] = useState('');
  const [tplOpts, setTplOpts] = useState<Option[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [preset, setPreset] = useState<QueryPreset | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);

  useEffect(() => {
    const run = async () => {
      setTplLoading(true);
      try {
        const list = await getQueryTemplates({ pageNum: 1, pageSize: 100 });
        const data = list.data ?? [];
        setTplOpts(mapQueryTemplatesToOptions(data));
        const def = data.find((t) => t.isDefault)?.queryNo ?? data[0]?.queryNo ?? '';
        if (!isCreateMode && !templateId && def) setTemplateId(def);
      } finally {
        setTplLoading(false);
      }
    };
    void run();
  }, [templateId, isCreateMode]);

  const applyDetailToPreset = (d: QueryTemplateDetailResult, id: string) => {
    const queryEngine = d.transformations?.[0]?.no ?? '';
    const searchAlgorithm = d.retrieval?.no ?? '';

    let topK = 5;
    let threshold = 0.2;
    const rp = d.retrieval?.parameters;
    if (isSemanticParams(rp)) {
      topK = num(rp.semantic?.topK, topK);
      threshold = num(rp.semantic?.threshold, threshold);
    } else if (isHybridParams(rp)) {
      topK = num(rp.semantic?.topK, num(rp.keyword?.topK, num(rp.reranker?.topK, topK)));
      threshold = num(rp.semantic?.threshold, threshold);
    }

    const reranking = d.reranking?.no ?? '';
    const llmModel = d.generation?.no ?? '';

    let temperature = 0.2;
    let multimodal = false;
    if (isGenerationParams(d.generation?.parameters)) {
      temperature = num(d.generation.parameters?.temperature, temperature);
      multimodal = bool(d.generation.parameters?.multimodal, multimodal);
    }

    setPreset({
      template: id,
      queryEngine,
      searchAlgorithm,
      topK,
      threshold,
      reranking,
      llmModel,
      temperature,
      multimodal,
      isDefault: !!d.isDefault,
    });
  };

  useEffect(() => {
    const run = async () => {
      if (!templateId || isCreateMode) {
        setPreset(null);
        return;
      }
      const d = await getQueryTemplateDetail(templateId);
      applyDetailToPreset(d, templateId);
    };
    void run();
  }, [templateId, isCreateMode]);

  const mergedOptions: RagOptions | null = useMemo(
    () => (ragOptions ? { ...ragOptions, queryTemplate: tplOpts } : null),
    [ragOptions, tplOpts]
  );

  const handleCreateNew = () => {
    setIsCreateMode(true);
    setTemplateId('');
    setPreset(null);
  };

  const handleQuerySave = async (payload: {
    template: string;
    templateName: string;
    queryEngine: string;
    searchAlgorithm: string;
    topK: number;
    threshold: number;
    reranking: string;
    llmModel: string;
    temperature: number;
    multimodal: boolean;
    isDefault: boolean;
    isCreateMode?: boolean;
  }) => {
    const isHybrid = !!ragOptions?.searchHybrid?.some((o) => o.value === payload.searchAlgorithm);

    const dto = {
      name: payload.templateName,
      transformations: payload.queryEngine ? [{ no: payload.queryEngine }] : [],
      retrieval: {
        no: payload.searchAlgorithm,
        parameters: isHybrid
          ? {
              semantic: { topK: payload.topK, threshold: payload.threshold },
              keyword: { topK: payload.topK },
              reranker: { topK: payload.topK },
            }
          : { semantic: { topK: payload.topK, threshold: payload.threshold } },
      },
      reranking: payload.reranking ? { no: payload.reranking } : undefined,
      generation: {
        no: payload.llmModel,
        parameters: { temperature: payload.temperature, multimodal: payload.multimodal },
      },
      isDefault: payload.isDefault,
    };

    if (isCreateMode) {
      const created = await createQueryTemplate(dto);
      const [detail, list] = await Promise.all([
        getQueryTemplateDetail(created.queryNo),
        getQueryTemplates({ pageNum: 1, pageSize: 100 }),
      ]);
      setTplOpts(mapQueryTemplatesToOptions(list.data ?? []));
      setTemplateId(created.queryNo);
      setIsCreateMode(false);
      applyDetailToPreset(detail, created.queryNo);
      onCreate?.();
      return;
    }

    await putQueryTemplate(payload.template, dto);

    const [detail, list] = await Promise.all([
      getQueryTemplateDetail(payload.template),
      getQueryTemplates({ pageNum: 1, pageSize: 100 }),
    ]);

    applyDetailToPreset(detail, payload.template);
    setTplOpts(mapQueryTemplatesToOptions(list.data ?? []));
  };

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div ref={anchors['query-embed']} />
        <div ref={anchors.searching} />
        <div ref={anchors.reranker} />
        <div ref={anchors.prompting} />
        <div ref={anchors.generation} />

        <QuerySettingsForm
          template={templateId}
          isCreateMode={isCreateMode}
          options={mergedOptions ?? undefined}
          loading={optionsLoading || tplLoading}
          preset={preset ?? undefined}
          onSave={handleQuerySave}
        />
      </div>

      <aside className="space-y-4">
        <TemplateList
          kind="query"
          active={templateId}
          onSelect={(id) => {
            setIsCreateMode(false);
            setTemplateId(id);
          }}
          onEdit={(id) => {
            setIsCreateMode(false);
            setTemplateId(id);
          }}
          onDelete={onRequestDelete}
          onCreate={handleCreateNew}
        />
      </aside>
    </section>
  );
}
