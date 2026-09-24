<script setup>
import { usePipelineStore } from '@/stores/pipeline.js'
import HeroPiece from './landing/HeroPiece.vue'
import Logo      from './Logo.vue'

/**
 * Start page (index.html) — what HoruCNC does, how it works, and a way in. Modelled on
 * PatternMaster's index.html (hero with a live 3D piece, steps, ideas, reasons, final call).
 * Links go to designer.html; an idea passes its template as `?template=<id>`.
 */
const store = usePipelineStore()

// With a stored project the main button continues it, otherwise it starts the first idea
const primaryHref  = store.hasProject ? 'designer.html' : 'designer.html?template=edge-engraving'
const primaryLabel = store.hasProject ? 'Back to my project' : 'Start with your camera'

// Plain-language cards for the built-in templates
const IDEAS = [
  { id: 'edge-engraving',      title: 'Outlines',
    text: 'Drawings, logos and lettering become crisp engraved lines.' },
  { id: 'grayscale-engraving', title: 'Shapes',
    text: 'Light and dark areas turn into clean closed shapes — great for signs and stencils.' },
  { id: 'relief',              title: 'Relief',
    text: 'The brightness of a photo becomes depth. Dark goes deep, light stays high.' },
]

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
  <div class="start">
    <header class="nav">
      <a class="brand" href="#top" aria-label="HoruCNC">
        <Logo class="brand-logo" />HoruCNC
      </a>
      <nav class="nav-links">
        <a href="#how">How it works</a>
        <a href="#ideas">Ideas</a>
        <a class="btn btn-primary btn-small" :href="primaryHref">
          {{ store.hasProject ? 'Back to my project' : 'Open the app' }}
        </a>
      </nav>
    </header>

    <main id="top">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Picture to CNC · in your browser</p>
          <h1>From a picture <span>to a <em class="cnc" data-text="CNC">CNC</em> program.</span></h1>
          <p class="lead">
            Take a snapshot with your camera, pick a few filters and watch the result live.
            HoruCNC plans the toolpaths and writes the file your machine understands.
            You just press start.
          </p>
          <div class="cta-row">
            <a class="btn btn-primary btn-big" :href="primaryHref">{{ primaryLabel }}</a>
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

      <!-- Ideas → templates -->
      <section id="ideas" class="ideas">
        <p class="eyebrow">Ideas</p>
        <h2 class="section-title">What will you make?</h2>
        <p class="section-lead">Pick a starting point. Each one opens a ready-made pipeline you can change step by step.</p>
        <div class="cards">
          <a v-for="idea in IDEAS" :key="idea.id" class="card" :href="`designer.html?template=${idea.id}`">
            <span class="card-art" :class="idea.id" aria-hidden="true">
              <!-- Outlines: an engraved star -->
              <svg v-if="idea.id === 'edge-engraving'" viewBox="0 0 120 80" fill="none" stroke-linejoin="round">
                <path d="M60 12l7.6 15.4 17 2.5-12.3 12 2.9 16.9L60 50.8l-15.2 8 2.9-16.9-12.3-12 17-2.5z" stroke="currentColor" stroke-width="2.5"/>
                <path d="M60 22l4.7 9.5 10.5 1.5-7.6 7.4 1.8 10.4L60 45.9l-9.4 4.9 1.8-10.4-7.6-7.4 10.5-1.5z" stroke="currentColor" stroke-width="1.5" opacity=".5"/>
              </svg>
              <!-- Shapes: closed filled regions -->
              <svg v-else-if="idea.id === 'grayscale-engraving'" viewBox="0 0 120 80" fill="none">
                <path d="M22 60c0-18 12-32 26-32 8 0 12 6 18 6s10-10 20-10c9 0 14 9 14 20 0 10-6 16-6 16z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
                <circle cx="44" cy="48" r="6" stroke="currentColor" stroke-width="2"/>
                <path d="M70 44h14v10H70z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
              <!-- Relief: depth lines -->
              <svg v-else viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-linecap="round">
                <path d="M16 24c14 0 18 6 30 6s18-10 30-10 16 6 28 6" stroke-width="2"/>
                <path d="M16 34c14 0 18 10 30 10s18-14 30-14 16 8 28 8" stroke-width="2" opacity=".85"/>
                <path d="M16 44c14 0 18 12 30 12s18-16 30-16 16 8 28 8" stroke-width="2" opacity=".65"/>
                <path d="M16 54c14 0 18 8 30 8s18-12 30-12 16 6 28 6" stroke-width="2" opacity=".45"/>
              </svg>
            </span>
            <span class="card-title">{{ idea.title }}</span>
            <span class="card-text">{{ idea.text }}</span>
            <span class="card-go">Start with this →</span>
          </a>
        </div>
        <p v-if="store.hasProject" class="note">Starting from an idea replaces your current pipeline.</p>
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
        <a class="btn btn-primary btn-big" :href="primaryHref">{{ primaryLabel }}</a>
      </section>
    </main>

    <footer class="footer">
      <Logo class="footer-logo" />
      HoruCNC · from a picture to a CNC program, right in your browser
    </footer>
  </div>
</template>

<style lang="less" scoped>
@import '@/assets/theme.less';

@pad: clamp(16px, 4vw, 40px);

.start {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scroll-behavior: smooth;
  background: @bg;
  color: @text;
  font-size: 17px;
  line-height: 1.55;
}

// ── Buttons ───────────────────────────────────────────────────────────────────
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 22px;
  border-radius: 999px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s, border-color 0.15s;

  &:hover { transform: translateY(-1px); }
}
.btn-primary { background: @accent; color: @on-accent; &:hover { opacity: 0.92; } }
.btn-ghost   { color: @text; border-color: @border; &:hover { border-color: @muted; } }
.btn-big     { padding: 16px 28px; font-size: 16px; }
.btn-small   { padding: 8px 16px; font-size: 14px; }

// ── Navigation ────────────────────────────────────────────────────────────────
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px @pad;
  background: fade(@bg, 82%);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid @hairline;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: @text;
  text-decoration: none;
}
.brand-logo  { width: 26px; height: 26px; }
.footer-logo { width: 18px; height: 18px; }

.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;

  > a { color: @muted; text-decoration: none; font-size: 14px; font-weight: 500; &:hover { color: @text; } }

  @media (max-width: 560px) { > a { display: none; } }
}

// ── Common ────────────────────────────────────────────────────────────────────
main > section {
  max-width: 1240px;
  margin: 0 auto;
  padding: 96px @pad;
}
.eyebrow {
  margin-bottom: 14px;
  font-family: @mono;
  font-size: 13px;
  letter-spacing: 0.02em;
  color: @accent;
}
.section-title {
  font-size: clamp(32px, 4.6vw, 54px);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.035em;

  span { color: @muted; }
}
.section-lead {
  margin-top: 18px;
  max-width: 620px;
  font-size: 19px;
  color: @muted;
}

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

// ── Ideas ─────────────────────────────────────────────────────────────────────
.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 44px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
}
.card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 22px 22px 24px;
  border-radius: 20px;
  border: 1px solid @hairline;
  background: @panel;
  color: @text;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;

  &:hover { border-color: @accent-line; transform: translateY(-2px); }
  &:hover .card-go { color: @accent; }
}
.card-art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  margin-bottom: 10px;
  border-radius: 14px;
  background: #0e0e10;
  color: @accent;

  svg { width: 58%; height: auto; }
}
.card-title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.card-text  { font-size: 15px; color: @muted; }
.card-go    { margin-top: 8px; font-size: 14px; font-weight: 600; color: @text; transition: color 0.15s; }
.note       { margin-top: 18px; font-size: 13px; color: @muted; }

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
  padding: 28px @pad 40px;
  border-top: 1px solid @hairline;
  font-size: 13px;
  color: @muted;
}
</style>
