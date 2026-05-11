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
 * @typedef {{type:'display', label:string, compute:(values:ParamValues)=>string}} DisplayParam
 * @typedef {{type:'sep'}} SepParam
 * @typedef {RangeParam|ToggleParam|CameraSelectParam|SelectParam|DisplayParam|SepParam} ParamDef
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
 * @typedef {{pluginId:string, kind:'gcode',  text:string}}        StepGcodeResult
 * @typedef {StepImageResult|StepGcodeResult} StepResult
 */

export {}
