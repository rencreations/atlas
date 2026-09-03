'use client';

import { useRef, useState } from 'react';
import { FileText, HelpCircle, Upload } from 'lucide-react';
import { ArrowRightIcon } from '@/components/icons/animated/arrow-right';
import { ExternalLinkIcon } from '@/components/icons/animated/external-link';
import { CheckIcon } from '@/components/icons/animated/check';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { GodmodeSettingItem } from '@/lib/godmode/types';
import { SecretField } from './secret-field';

export interface EditorValue {
  value: string | boolean | number;
}

export function initialEditorValue(item: GodmodeSettingItem): EditorValue {
  if (item.type === 'boolean') {
    return { value: item.value === true };
  }
  return { value: String(item.value ?? item.defaultValue ?? '') };
}

// Long-form documents get a dedicated editor instead of a one-line input.
export const LEGAL_DOC_KEYS = new Set(['legal.termsText', 'legal.privacyText']);

export function isValidJson(raw: string): boolean {
  if (raw.trim() === '') return true;
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

export function SettingControl({
  item,
  entry,
  jsonValid,
  disabled = false,
  onChange,
}: {
  item: GodmodeSettingItem;
  entry: EditorValue;
  /** Whether the current value parses as JSON (only meaningful for json items). */
  jsonValid: boolean;
  /** Grey out the control because its prerequisite is not configured. */
  disabled?: boolean;
  onChange: (value: EditorValue['value']) => void;
}) {
  if (LEGAL_DOC_KEYS.has(item.key) || item.fileUpload) {
    return <LongTextControl item={item} entry={entry} onChange={onChange} />;
  }

  if (item.type === 'boolean') {
    return (
      <Switch
        checked={entry.value === true}
        onCheckedChange={(v) => onChange(v)}
        disabled={disabled}
        aria-label={item.label}
      />
    );
  }

  if (item.type === 'enum' && item.options) {
    return (
      <Select value={String(entry.value)} onValueChange={(v) => onChange(v)} disabled={disabled}>
        <SelectTrigger className="w-[240px]" aria-label={item.label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {item.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (item.type === 'number') {
    return (
      <Input
        type="number"
        className="w-[160px]"
        aria-label={item.label}
        disabled={disabled}
        // Keep '' while the field is empty instead of coercing to 0;
        // emptied numbers are skipped at save time.
        value={String(entry.value)}
        placeholder={item.placeholder}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
    );
  }

  if (item.type === 'json') {
    return (
      <div className="flex w-[280px] flex-col gap-1">
        <Textarea
          className="w-full font-mono text-[12px]"
          rows={4}
          aria-label={item.label}
          invalid={!jsonValid}
          disabled={disabled}
          value={String(entry.value)}
          onChange={(e) => onChange(e.target.value)}
        />
        {!jsonValid ? (
          <span className="text-[12px] text-brand-red">Invalid JSON, fix before saving.</span>
        ) : null}
      </div>
    );
  }

  if (item.secret) {
    return (
      <SecretField
        item={item}
        disabled={disabled}
        onChange={(v) => onChange(v)}
      />
    );
  }

  return (
    <Input
      className="w-[280px]"
      value={String(entry.value)}
      placeholder={item.placeholder}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={item.label}
    />
  );
}

/**
 * Long-form content (legal documents, .p8 keys, certificates) gets a
 * right-anchored Edit button instead of a cramped inline field. The dialog
 * shows the CURRENT content for editing and offers a file upload as the
 * preferred way to fill it; Apply stages the text into the form, where it
 * joins the other pending changes until Save is pressed.
 */
function LongTextControl({
  item,
  entry,
  onChange,
}: {
  item: GodmodeSettingItem;
  entry: EditorValue;
  onChange: (value: EditorValue['value']) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const value = String(entry.value);
  const isUpload = Boolean(item.fileUpload);

  const openEditor = () => {
    setDraft(value);
    setOpen(true);
  };

  return (
    <div className="flex w-[280px] justify-end">
      <Button variant="secondary" size="sm" onClick={openEditor}>
        {isUpload ? (
          <Upload className="h-4 w-4" strokeWidth={2.25} />
        ) : (
          <FileText className="h-4 w-4" strokeWidth={2.25} />
        )}
        {isUpload ? 'Upload file' : 'Edit'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg" className="w-[calc(100%-2rem)]">
          <DialogTitle>{item.label}</DialogTitle>
          <DialogDescription>
            {isUpload
              ? item.fileUpload!.hint
              : `${item.description} Paste the document below, or upload a Markdown file.`}
          </DialogDescription>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={18}
            className="mt-5 min-h-[300px] w-full font-normal text-[13px]"
            aria-label={`${item.label} content`}
            placeholder={isUpload ? 'Paste the file contents here.' : '# ' + item.label}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={item.fileUpload?.accept ?? '.md,.markdown,text/markdown,text/plain'}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void file
                  .text()
                  .then(setDraft)
                  .catch(() => undefined);
              }
              e.target.value = '';
            }}
          />
          <DialogFooter className="mt-5">
            <Button
              variant="secondary"
              size="sm"
              className="mr-auto"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" strokeWidth={2.25} />
              {isUpload ? 'Upload file' : 'Upload .md file'}
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              <CheckIcon size={16} className="flex items-center justify-center" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * One registry setting rendered as a card: label, badges, description,
 * optional action/hint, and its control. A row with nothing but a label
 * (no description, tooltip, action, or hint) centers the label against
 * the control instead of top-aligning it, the top alignment exists to
 * keep multi-line rows readable but looks like a stray gap on a bare row.
 */
export function SettingRow({
  item,
  entry,
  hint,
  onNavigate,
  onChange,
}: {
  item: GodmodeSettingItem;
  entry: EditorValue;
  hint: { hint: string; section: string } | null;
  onNavigate?: (section: string) => void;
  onChange: (value: EditorValue['value']) => void;
}) {
  const singleLine = !item.description && !item.moreInfo && !item.action && !hint;
  return (
    <div className="rounded border border-line bg-surface p-4 shadow-1">
      <div className={cn('flex justify-between gap-4', singleLine ? 'items-center' : 'items-start')}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-ink">{item.label}</span>
            {item.secret ? (
              <span className="rounded bg-brand-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-blue">
                secret
              </span>
            ) : null}
            {item.advanced ? (
              <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                advanced
              </span>
            ) : null}
            {item.moreInfo ? (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`More about ${item.label}`}
                      className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-3 transition-colors duration-120 hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>{item.moreInfo}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-1 text-[13px] text-ink-3">{item.description}</p>
          ) : null}
          {item.action && onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate(item.action!.section)}
              className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-blue underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {item.action.label}
              <ArrowRightIcon size={12} className="flex items-center justify-center" />
            </button>
          ) : null}
          {hint ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-brand-yellow-ink">
              <span className="flex items-start gap-1.5">
                <span aria-hidden>!</span>
                {hint.hint}
              </span>
              {onNavigate ? (
                <button
                  type="button"
                  onClick={() => onNavigate(hint.section)}
                  className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                >
                  Configure now
                  <ArrowRightIcon size={12} className="flex items-center justify-center" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className={cn('shrink-0', hint && 'opacity-50')}>
          <SettingControl
            item={item}
            entry={entry}
            disabled={Boolean(hint)}
            jsonValid={item.type === 'json' ? isValidJson(String(entry.value)) : true}
            onChange={onChange}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * A field nested inside another card (a provider's config, an integration's
 * config): label + description on the left, control on the right, no
 * outer border of its own. Shared by every "expand to reveal fields"
 * panel (sign-in methods, OAuth providers, provider choices, integrations).
 */
export function InlineFieldRow({
  item,
  entry,
  hint,
  onChange,
}: {
  item: GodmodeSettingItem;
  entry: EditorValue;
  hint: { hint: string; section: string } | null;
  onChange: (value: EditorValue['value']) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-ink">{item.label}</span>
          {item.secret ? (
            <span className="rounded bg-brand-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-blue">
              secret
            </span>
          ) : null}
          {item.docUrl ? (
            <a
              href={item.docUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded text-[11.5px] font-medium text-brand-blue underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Get a key
              <ExternalLinkIcon size={11} className="flex items-center justify-center" />
            </a>
          ) : null}
        </div>
        {item.description ? (
          <p className="mt-0.5 text-[12px] text-ink-4">{item.description}</p>
        ) : null}
        {hint ? (
          <p className="mt-1 text-[12.5px] text-brand-yellow-ink">
            <span aria-hidden>! </span>
            {hint.hint}
          </p>
        ) : null}
      </div>
      <div className={cn('shrink-0', hint && 'opacity-50')}>
        <SettingControl
          item={item}
          entry={entry}
          jsonValid={item.type === 'json' ? isValidJson(String(entry.value)) : true}
          disabled={Boolean(hint)}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
