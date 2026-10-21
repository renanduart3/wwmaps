import type {IncomingMessage} from 'node:http';
export function localStudioRequest(req:Pick<IncomingMessage,'headers'|'socket'>):boolean;
export function localStudioPlugin(root:string):unknown;
