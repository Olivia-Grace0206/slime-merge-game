import type { ReactNode } from 'react'
import type { AttributeId } from '../domain/attributes'
const SHAPES:Readonly<Record<AttributeId,ReactNode>>={
 fire:<><path d="M13 2c2 6-4 6-1 10 1-2 3-3 4-4 1 3 5 6 3 10-2 5-12 6-15 0C1 12 8 9 8 5c0 3 2 4 3 5 1-3 2-5 2-8Z" fill="currentColor" stroke="none"/><path d="M12 14c-5 4-2 7 1 6 3-1 2-4-1-6Z" fill="#fff5d6" stroke="none"/></>,
 gold:<><circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity=".18"/><circle cx="12" cy="12" r="6"/><path d="M10 8h5m-5 8h5m-3-9v10"/></>,
 dark:<path d="M19 17A9 9 0 0 1 10 3a9 9 0 1 0 9 14Z" fill="currentColor"/>,
 ice:<><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M4 14l4 1-1 4M20 10l-4-1 1-4"/></>,
 lightning:<path d="m13 2-9 12h7l-1 8 10-13h-7Z" fill="currentColor" strokeLinejoin="round"/>,
 nature:<><path d="M20 3C8 2 2 7 5 16c8 5 15 0 15-13Z" fill="currentColor" fillOpacity=".24"/><path d="M3 22 16 8M9 15l-1-5m4 2h5"/></>,
 luck:<><path d="M12 11C0 10 3 0 9 3c3 0 3 4 3 8Zm0 0C12-1 22 2 21 8c-1 3-5 3-9 3Zm0 0c12 0 9 10 3 9-3-1-3-5-3-9Zm0 0C11 23 1 20 3 14c1-3 5-3 9-3Z" fill="currentColor" fillOpacity=".45"/><path d="M12 12c0 5 2 8 6 10"/></>,
 mutation:<><path d="M6 2c0 8 12 12 12 20M18 2C18 10 6 14 6 22M7 5h10M9 9h6M9 15h6M7 19h10"/></>,
 light:<><circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity=".35"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>,
 magnet:<><path d="M4 3h5v10a3 3 0 0 0 6 0V3h5v10a8 8 0 0 1-16 0Z" fill="currentColor" fillOpacity=".4"/><path d="M4 8h5m6 0h5"/></>,
}
/** The same small SVG is used on board badges, guide, details, combinations and previews. */
export function AttributeIcon({id,className=''}:{id:AttributeId;className?:string}){
 return <svg className={`attribute-icon ${className}`} data-attribute-icon={id} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{SHAPES[id]}</svg>
}
