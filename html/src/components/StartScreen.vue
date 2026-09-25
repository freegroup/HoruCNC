<script setup>
import { usePipelineStore } from '@/stores/pipeline.js'
import HeroPiece    from './landing/HeroPiece.vue'
import SiteNav      from './landing/SiteNav.vue'
import ExampleCards from './landing/ExampleCards.vue'
import Logo         from './Logo.vue'

/**
 * Start page (index.html) — what HoruCNC does, how it works, examples, and a way in. Modelled on
 * PatternMaster's index.html (hero with a live 3D piece, steps, examples, reasons, final call).
 * "Start a new project" leads to new.html (continue / template / example); an example card
 * opens the designer directly.
 */
const store = usePipelineStore()

const STEPS = [
  { n: '1', title: 'Start',       sub: 'with a picture',    text: 'Hold a drawing, a logo or an object in front of your camera and take a snapshot.' },
  { n: '2', title: 'Convert',     sub: 'to vectors',        text: 'Filters sharpen the picture and turn it into lines. Every step shows before and after.' },
  { n: '3', title: 'Manufacture', sub: 'get ready to cut',  text: 'Pick your cutter, the depth and the speeds — and see the milled piece in 3D.' },
  { n: '4', title: 'Export',      sub: 'your machine code', text: 'Download the G-code for GRBL or Marlin and load it into your CNC.' },
]

const REASONS = [
  { title: 'See it before you mill',  text: 'The 3D preview shows the piece as it comes out of the machine. No guessing, no wasted wood.' },
  { title: 'No expert needed',        text: 'Start from an idea below and change one thing at a time. Nothing can break — it is only a preview until you mill.' },
  { title: 'Just your browser',       text: 'Nothing to install, no account. Your camera picture never leaves your computer.' },
]

</script>

<template>
  <div class="page">
    <SiteNav home="#top">
      <a href="#how">How it works</a>
      <a href="#examples">Examples</a>
      <a class="btn btn-primary btn-small" href="new.html">Start a new project</a>
    </SiteNav>

    <main id="top">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Picture to CNC · in your browser</p>
          <h1>From a picture <span>to a <em class="cnc" data-text="CNC">CNC</em> program.</span></h1>
          <p class="lead">
            Take a snapshot with your camera, pick a few filters and watch the result live.
            <span class="brand-inline">Horu<span class="brand-cnc">CNC</span></span> plans the toolpaths and writes the file your machine understands.
            You just press start.
          </p>
          <p class="horu-gloss">
            <span class="kanji">彫る</span>
            <span class="reading">horu</span>
            <span class="mean">Japanese for <em>to carve · engrave · sculpt</em> — the “Horu” in HoruCNC.</span>
          </p>
          <div class="cta-row">
            <a class="btn btn-primary btn-big" href="new.html">Start a new project</a>
            <a class="btn btn-ghost btn-big" href="#how">How it works</a>
          </div>
          <ul class="facts">
            <li>Runs in the browser</li>
            <li>Nothing to install</li>
            <li>Live 3D preview</li>
          </ul>
        </div>
        <HeroPiece class="hero-visual" />
      </section>

      <!-- How it works -->
      <section id="how" class="how">
        <p class="eyebrow">How it works</p>
        <h2 class="section-title">Four steps <span>from snapshot to G-code.</span></h2>
        <ol class="steps">
          <li v-for="s in STEPS" :key="s.n">
            <span class="step-num">{{ s.n }}</span>
            <h3>{{ s.title }} <span>{{ s.sub }}</span></h3>
            <p>{{ s.text }}</p>
          </li>
        </ol>
      </section>

      <!-- Examples -->
      <section id="examples" class="examples">
        <p class="eyebrow">Examples</p>
        <h2 class="section-title">What will you make?</h2>
        <p class="section-lead">Open a finished example — picture and pipeline included — and change it step by step.</p>
        <ExampleCards />
        <p v-if="store.hasProject" class="note">Opening an example replaces your current pipeline.</p>
      </section>

      <!-- Why -->
      <section class="why">
        <div v-for="r in REASONS" :key="r.title" class="why-item">
          <h3>{{ r.title }}</h3>
          <p>{{ r.text }}</p>
        </div>
      </section>

      <!-- Final call -->
      <section class="final">
        <h2>Ready for your <span>first piece?</span></h2>
        <a class="btn btn-primary btn-big" href="new.html">Start a new project</a>
      </section>
    </main>

    <footer class="footer">
      <Logo class="footer-logo" />
      <span class="brand-inline">Horu<span class="brand-cnc">CNC</span></span> · from a picture to a CNC program, right in your browser
    </footer>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/site.less';

// ── Hero ──────────────────────────────────────────────────────────────────────
.hero {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: clamp(32px, 5vw, 72px);
  align-items: center;
  padding-top: 72px !important;

  @media (max-width: 900px) { grid-template-columns: 1fr; }

  h1 {
    font-size: clamp(44px, 6.6vw, 84px);
    font-weight: 700;
    line-height: 0.98;
    letter-spacing: -0.045em;

    span { display: block; color: @muted; }
    .cnc { .cnc-mark(@bg); }
  }
}
.lead {
  margin-top: 26px;
  max-width: 540px;
  font-size: 19px;
  color: @muted;
}
.horu-gloss {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 20px;
  font-size: 15px;
  color: @muted;

  .kanji   { font-size: 24px; line-height: 1; color: @accent; }
  .reading { font-family: @mono; font-size: 13px; letter-spacing: 0.04em; color: @accent; }
  .mean    { em { color: @text; font-style: italic; } }
}
.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 34px;
}
.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  margin-top: 30px;
  list-style: none;
  font-size: 14px;
  color: @muted;

  li::before { content: '✓'; margin-right: 8px; color: @accent; }
}

// ── How ───────────────────────────────────────────────────────────────────────
.steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 48px;
  list-style: none;

  @media (max-width: 1000px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 560px)  { grid-template-columns: 1fr; }

  li {
    padding: 26px 24px;
    border-radius: 20px;
    border: 1px solid @hairline;
    background: @panel;
  }
  h3 {
    margin-top: 18px;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;

    span { display: block; font-size: 16px; font-weight: 400; color: @muted; letter-spacing: -0.01em; }
  }
  p { margin-top: 12px; font-size: 15px; color: @muted; }
}
.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid @border;
  font-family: @mono;
  font-size: 14px;
  color: @muted;
}

// ── Why ───────────────────────────────────────────────────────────────────────
.why {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(24px, 4vw, 56px);
  border-top: 1px solid @hairline;

  @media (max-width: 900px) { grid-template-columns: 1fr; }

  h3 { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  p  { margin-top: 10px; font-size: 16px; color: @muted; }
}

// ── Final ─────────────────────────────────────────────────────────────────────
.final {
  text-align: center;
  padding-bottom: 120px !important;

  h2 {
    margin-bottom: 34px;
    font-size: clamp(36px, 5.4vw, 64px);
    font-weight: 700;
    line-height: 1.02;
    letter-spacing: -0.04em;

    span { display: block; color: @muted; }
  }
}

.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px @page-pad 40px;
  border-top: 1px solid @hairline;
  font-size: 13px;
  color: @muted;
}
.footer-logo { width: 18px; height: 18px; }
</style>
