import type { GridPosition } from './grid'
import type { AttributeId } from './attributes'
type Base=Readonly<{id:string;sequence:number;cell:GridPosition;createdAtMs:number}>
export type PurpleEvent=Base&Readonly<{kind:'purple';sourceId:string|null;progressMs:number;updatedAtMs:number}>
export type BlueEvent=Base&Readonly<{kind:'blue';expiresAtMs:number}>
export type SpecialState=Readonly<{sequence:number;nextPurpleAtMs:number;nextBlueAtMs:number;events:readonly (PurpleEvent|BlueEvent)[];lastAwakening:Readonly<{eventId:string;sourceId:string;attributeId:AttributeId;atMs:number}>|null}>
export type EffectContext=Readonly<{blueCells?:readonly GridPosition[]}>
