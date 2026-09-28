import meander    from './meander.js'
import halftone   from './halftone.js'
import crosshatch from './crosshatch.js'
import spiral     from './spiral.js'
import radial     from './radial.js'
import plunge     from './plunge.js'
import waterline  from './waterline.js'

/**
 * The ways Terrain can move the cutter over the picture. A strategy is
 *   { id, label, params, make(field, params, step) }
 * `params` are its own settings (shown only while it is chosen); `make` returns point
 * sequences to cut along — or `{ paths }`, finished [x, y, z] paths. Plain JS, no UI:
 * the plugin definition and the worker both read it. The first one is the default.
 */
export const STRATEGIES = [meander, halftone, crosshatch, spiral, radial, plunge, waterline]

export const strategyById = id => STRATEGIES.find(s => s.id === id) ?? STRATEGIES[0]

/** Where a strategy's own setting is stored in the step's values: 'meander.lineStep'. */
export const ownKey = (strategy, key) => `${strategy.id}.${key}`

/** A strategy's own settings out of the step's values, by their plain keys ({ lineStep }). */
export const ownValues = (strategy, values) =>
  Object.fromEntries(strategy.params.map(p => [p.key, values[ownKey(strategy, p.key)] ?? p.default]))
