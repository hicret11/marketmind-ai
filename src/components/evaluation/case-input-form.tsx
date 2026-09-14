"use client";

import { useState } from "react";
import type {
  BenchmarkTaskId,
  ContentInput,
  ImageInput,
  LeadQualificationInput,
  LyricsInput,
  WebsiteAnalysisInput,
} from "@/types/evaluation";

/** Task-specific "add a case" input forms — kept plain (no rich editors) per the spec's "don't overbuild secondary benchmarks" note. */
export function CaseInputForm({
  taskId,
  onSubmit,
  submitting,
}: {
  taskId: BenchmarkTaskId;
  onSubmit: (label: string, input: unknown) => void;
  submitting: boolean;
}) {
  if (taskId === "lead-qualification") return <LeadQualificationForm onSubmit={onSubmit} submitting={submitting} />;
  if (taskId === "website-analysis") return <WebsiteAnalysisForm onSubmit={onSubmit} submitting={submitting} />;
  if (taskId === "lyrics") return <LyricsForm onSubmit={onSubmit} submitting={submitting} />;
  if (taskId === "content") return <ContentForm onSubmit={onSubmit} submitting={submitting} />;
  return <ImageForm onSubmit={onSubmit} submitting={submitting} />;
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-mm-rose focus:outline-none";
const labelCls = "block text-xs font-medium text-mm-ink";

function LeadQualificationForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (label: string, input: unknown) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-gray-50 p-2 text-[11px] text-mm-muted">
        The recommended way to add Lead Qualification cases is the &ldquo;Add to Evaluation
        Dataset&rdquo; button on a real business in Opportunity Discovery — it carries over the
        verified data and website evidence automatically. This manual form creates a case with no
        website evidence signals.
      </p>
      <div>
        <label className={labelCls}>Business name</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Category</label>
          <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Website</label>
          <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Address</label>
        <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <button
        type="button"
        disabled={!name.trim() || submitting}
        onClick={() => {
          const input: LeadQualificationInput = {
            businessName: name.trim(),
            category: category.trim() || null,
            address: address.trim() || null,
            website: website.trim() || null,
            matchedCategories: [],
            signals: [],
            evidence: [],
            referenceFitScore: null,
          };
          onSubmit(name.trim(), input);
        }}
        className="rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add case"}
      </button>
    </div>
  );
}

function WebsiteAnalysisForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (label: string, input: unknown) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [websiteText, setWebsiteText] = useState("");

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Business name</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Yes/no question</label>
        <input
          className={inputCls}
          placeholder="Does this business offer birthday parties?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>
      <div>
        <label className={labelCls}>Website text (paste real extracted text)</label>
        <textarea
          className={`${inputCls} min-h-28`}
          value={websiteText}
          onChange={(e) => setWebsiteText(e.target.value)}
        />
      </div>
      <button
        type="button"
        disabled={!name.trim() || !question.trim() || submitting}
        onClick={() => {
          const input: WebsiteAnalysisInput = {
            businessName: name.trim(),
            question: question.trim(),
            websiteText,
          };
          onSubmit(name.trim(), input);
        }}
        className="rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add case"}
      </button>
    </div>
  );
}

function LyricsForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (label: string, input: unknown) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [relationship, setRelationship] = useState("");
  const [personality, setPersonality] = useState("");
  const [memory, setMemory] = useState("");
  const [language, setLanguage] = useState("English");
  const [genre, setGenre] = useState("Pop");
  const [otherNotes, setOtherNotes] = useState("");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Age</label>
          <input className={inputCls} value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Relationship to recipient</label>
          <input className={inputCls} value={relationship} onChange={(e) => setRelationship(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Personality</label>
          <input className={inputCls} value={personality} onChange={(e) => setPersonality(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Shared memory</label>
        <textarea className={inputCls} value={memory} onChange={(e) => setMemory(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Language</label>
          <input className={inputCls} value={language} onChange={(e) => setLanguage(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Genre</label>
          <input className={inputCls} value={genre} onChange={(e) => setGenre(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Other notes</label>
        <input className={inputCls} value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} />
      </div>
      <button
        type="button"
        disabled={!name.trim() || submitting}
        onClick={() => {
          const input: LyricsInput = {
            name: name.trim(),
            age: age.trim() || null,
            relationship: relationship.trim() || null,
            personality: personality.trim() || null,
            memory: memory.trim() || null,
            language: language.trim() || "English",
            genre: genre.trim() || "Pop",
            otherNotes: otherNotes.trim() || null,
          };
          onSubmit(`${name.trim()}'s birthday song`, input);
        }}
        className="rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add case"}
      </button>
    </div>
  );
}

function ContentForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (label: string, input: unknown) => void;
  submitting: boolean;
}) {
  const [platform, setPlatform] = useState("Instagram");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [contentType, setContentType] = useState("Caption");
  const [brandVoice, setBrandVoice] = useState("Warm, celebratory, personal");
  const [requiredCta, setRequiredCta] = useState("");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Platform</label>
          <input className={inputCls} value={platform} onChange={(e) => setPlatform(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Content type</label>
          <input className={inputCls} value={contentType} onChange={(e) => setContentType(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Goal</label>
        <input className={inputCls} value={goal} onChange={(e) => setGoal(e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Target audience</label>
        <input className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Brand voice</label>
        <input className={inputCls} value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Required CTA (optional)</label>
        <input className={inputCls} value={requiredCta} onChange={(e) => setRequiredCta(e.target.value)} />
      </div>
      <button
        type="button"
        disabled={!goal.trim() || !audience.trim() || submitting}
        onClick={() => {
          const input: ContentInput = {
            platform: platform.trim() || "Instagram",
            goal: goal.trim(),
            audience: audience.trim(),
            contentType: contentType.trim() || "Caption",
            brandVoice: brandVoice.trim(),
            requiredCta: requiredCta.trim() || null,
          };
          onSubmit(`${platform.trim()} · ${goal.trim()}`, input);
        }}
        className="rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add case"}
      </button>
    </div>
  );
}

function ImageForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (label: string, input: unknown) => void;
  submitting: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<ImageInput["category"]>("cake");
  const [constraints, setConstraints] = useState("No visible faces or people.");

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Prompt</label>
        <textarea className={inputCls} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Category</label>
        <select
          className={inputCls}
          value={category}
          onChange={(e) => setCategory(e.target.value as ImageInput["category"])}
        >
          {["balloons", "cake", "flowers", "pets", "romantic", "sunset"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Constraints</label>
        <input className={inputCls} value={constraints} onChange={(e) => setConstraints(e.target.value)} />
      </div>
      <button
        type="button"
        disabled={!prompt.trim() || submitting}
        onClick={() => {
          const input: ImageInput = { prompt: prompt.trim(), category, constraints: constraints.trim() || null };
          onSubmit(prompt.trim().slice(0, 60), input);
        }}
        className="rounded-full bg-mm-pink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add case"}
      </button>
    </div>
  );
}
