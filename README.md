# HoruCNC ([horu](https://glosbe.com/ja/en/horu))

From a picture to a CNC program — right in your browser.

CNC machines are an essential part of the hacker's toolset, but the software to create toolpaths
is often expensive and complex. HoruCNC keeps it simple: take a picture with your camera, pick a
few filters, watch the result live and download the G-code for your machine. No programming, no
install.

## How it works

The pipeline runs top to bottom in four parts:

1. **Start** — with a picture: camera snapshot, then image filters (grayscale, edges, crop, …)
2. **Convert** — to vectors: outlines, centre lines or a 3D height map, then vector filters
3. **Manufacture** — machine setup: cutter, depth per pass, feeds and speeds, with a 3D preview
   of the milled piece and the toolpaths
4. **Export** — your machine code: GRBL or Marlin

Every step shows a before/after comparison, filters can be reordered by drag & drop, and all
processing runs in a Web Worker.

## Run it

```
cd html
npm install
npm run dev
```

Then open http://localhost:5173.

## Build

```
cd html
npm run build
```

The build goes to `docs/` (served by GitHub Pages). The GitHub Action in `.github/workflows`
builds and commits it on every push to `master`.

## Repository

| Folder         | Content                                                       |
|----------------|---------------------------------------------------------------|
| `html/`        | the app (Vue 3, Pinia, Vite, Three.js)                        |
| `docs/`        | build output                                                  |
| `design/`      | Sketch design sources and the pipeline illustrations          |
| `test-images/` | pictures for trying out the filters                           |

The first version of HoruCNC was a Python desktop app (Qt/Kivy, OpenCV). It has been replaced by
this web version; the old code is still in the Git history.
