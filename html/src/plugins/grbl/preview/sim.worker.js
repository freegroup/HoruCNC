import { stamp, cutSegments } from './simulate.js'

// job: { id, moves, stock, cell, radius, lut } → { id, H, nx, ny, cell, stock }
self.onmessage = ({ data: job }) => {
  const { stock, cell } = job
  const nx = Math.max(2, Math.ceil(stock.w / cell) + 1)
  const ny = Math.max(2, Math.ceil(stock.h / cell) + 1)
  const H  = new Float32Array(nx * ny)
  stamp(H, cutSegments(job.moves, stock.x, stock.y), nx, ny, cell, job.radius, job.lut)
  self.postMessage({ id: job.id, H, nx, ny, cell, stock }, [H.buffer])
}
