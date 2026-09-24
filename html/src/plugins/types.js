/**
 * Shared constants and JSDoc typedefs.
 * No TypeScript — use these JSDoc types for editor intellisense.
 *
 * @typedef {'none'|'image'|'contour'|'gcode'} DataType
 *
 * @typedef {{type:'range', key:string, label:string, min:number, max:number, default:number, unit?:string, step?:number}} RangeParam
 * @typedef {{type:'toggle', key:string, label:string, default:boolean}} ToggleParam
 * @typedef {{type:'camera-select', key:string, label:string, default:string}} CameraSelectParam
 * @typedef {{type:'select', key:string, label:string, default:string, options:{value:string,label:string}[], applyPreset?:(id:string)=>Record<string,any>}} SelectParam
 * @typedef {{type:'display', label:string, compute:(values:ParamValues, ctx:ParamContext)=>string}} DisplayParam
 * @typedef {{type:'number', key:string, label:string, default:number, unit?:string, min?:number, max?:number, step?:number}} NumberParam
 * @typedef {{type:'sep'}} SepParam
 * @typedef {{type:'heading', label:string}} HeadingParam
 * @typedef {{type:'hidden', key:string, default:any}} HiddenParam — a value with no control here (set elsewhere)
 * @typedef {(RangeParam|ToggleParam|CameraSelectParam|SelectParam|NumberParam|DisplayParam|SepParam|HeadingParam|HiddenParam) & {when?:(values:ParamValues, ctx:ParamContext)=>boolean}} ParamDef
 * @typedef {{camera:object|null}} ParamContext
 * @typedef {Record<string, number|boolean|string>} ParamValues
 *
 * @typedef {{
 *   id: string,
 *   label: string,
 *   inputType: DataType,
 *   outputType: DataType,
 *   params: ParamDef[],
 *   InputComponent?: import('vue').Component,
 *   OutputComponent?: import('vue').Component,
 * }} FilterPlugin
 *
 * @typedef {{pluginId:string, kind:'image', bitmap:ImageBitmap}} StepImageResult
 * @typedef {{pluginId:string, kind:'gcode', moves:Float32Array, tool:object, safeZ:number}} StepGcodeResult — moves packed [rapid, x, y, z] × n
 * @typedef {StepImageResult|StepGcodeResult} StepResult
 */

export {}
