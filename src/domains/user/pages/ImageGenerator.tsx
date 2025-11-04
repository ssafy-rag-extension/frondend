import { useState } from 'react';
import { generateImages, regenerateImages } from '@/domains/user/api/image.api';
import type { GenerateImageRequest } from '@/domains/user/types/image.type';
import { toast } from 'react-toastify';
import type { StylePreset } from '@/domains/user/types/image.type';
import ImageGeneratorForm from '@/domains/user/components/ImageGeneratorForm';
import ImageResultPane from '@/domains/user/components/ImageResultPane';

type GeneratedImage = { image_id: string; url: string };

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<string>('1024x1024');
  const [style, setStyle] = useState<StylePreset>('poster');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);

  const MAX_LEN = 300;
  const disabled = loading || !prompt.trim();

  const onGenerate = async (_override?: Partial<GenerateImageRequest>) => {
    if (!prompt.trim()) return;
    setLoading(true);

    const body: GenerateImageRequest = { prompt, size, style, ..._override };

    try {
      const newImages = await generateImages(body);
      if (!newImages.length) {
        toast.error('이미지를 생성하지 못했어요. 프롬프트를 조금 더 구체화해 보세요.');
        return;
      }
      setImages(newImages);
    } catch (err) {
      console.error('generateImages error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRegenerate = async (image_id: string, _override?: Partial<GenerateImageRequest>) => {
    if (!prompt.trim()) return;
    setLoading(true);

    const body: GenerateImageRequest & { image_id: string } = {
      image_id,
      prompt,
      size,
      style,
      ..._override,
    };

    try {
      const newImages = await regenerateImages(body);
      if (!newImages.length) {
        toast.error('이미지를 다시 생성하지 못했어요. 프롬프트를 구체화해 보세요.');
        return;
      }
      setImages(newImages);
    } catch (err) {
      console.error('regenerateImages error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onDownload = async (src: string, idx: number) => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `retina-image-${idx + 1}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('다운로드에 실패했어요.');
    }
  };

  const onCopy = async (src: string) => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();

      // @ts-ignore
      if (typeof ClipboardItem !== 'undefined' && blob.type !== 'image/webp') {
        // @ts-ignore
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        toast.success('이미지를 클립보드로 복사했어요.');
      } else {
        await navigator.clipboard.writeText(src);
        toast.info('이미지 주소를 복사했어요.');
      }
    } catch {
      toast.error('복사에 실패했어요.');
    }
  };

  const onReusePrompt = (addition?: string) => {
    const next = (prompt.trim() + (addition ? ` ${addition}` : '')).slice(0, MAX_LEN);
    setPrompt(next);
    toast.info('프롬프트에 적용했어요.');
  };

  return (
    <section className="h-full grid grid-cols-1 lg:grid-cols-[600px_1fr] gap-6">
      <ImageGeneratorForm
        prompt={prompt}
        setPrompt={setPrompt}
        size={size}
        setSize={setSize}
        style={style}
        setStyle={setStyle}
        loading={loading}
        disabled={disabled}
        maxLen={MAX_LEN}
        onGenerate={onGenerate}
        onReusePrompt={onReusePrompt}
      />

      <ImageResultPane
        images={images}
        loading={loading}
        style={style}
        size={size}
        onDownload={onDownload}
        onCopy={onCopy}
        onRegenerate={id => onRegenerate(id)}
      />
    </section>
  );
}
