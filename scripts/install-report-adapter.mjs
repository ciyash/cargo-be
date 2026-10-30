import fs from 'node:fs';
import path from 'node:path';
import router from '../routes/index.js';
import { REPORT_PATHS } from '../utils/report-pagination.js';
const root = path.resolve('../crm-frontend/src/app');
const config = {};
for (const mount of router.stack) {
  for (const layer of mount.handle.stack || []) {
    if (!layer.route) continue;
    const handler = layer.route.stack.find(entry => REPORT_PATHS[entry.handle.name]);
    if (!handler) continue;
    const parent = mount.regexp.source.match(/^\^\\\/([^\(]+)/)?.[1]?.replaceAll('\\/', '/');
    if (!parent) throw Error('Unrecognized route mount');
    const name = handler.handle.name;
    config[parent + layer.route.path] = {paths: REPORT_PATHS[name].map(p => p === '$' ? 'data' : p), raw: REPORT_PATHS[name][0] === '$'};
  }
}
const write = (name, text) => fs.writeFileSync(path.join(root,name),text);
write('service/report-pages.ts', `// Detail paths from the backend pagination contract. Summary arrays are preserved.
export const REPORTS: Record<string, {paths:string[];raw:boolean}> = ${JSON.stringify(config,null,2)};
export function nextReportPage(body: any): number | null {
  const lists = [body?.pagination, ...Object.values(body?.pagination?.sections || {})] as any[];
  const pages = lists.filter(p => p?.hasNextPage && Number.isInteger(p.nextPage)).map(p => p.nextPage);
  return pages.length ? Math.min(...pages) : null;
}
function mergePath(before: any, after: any, segments: string[]): any {
  if (!segments.length) return [...(Array.isArray(before) ? before : []), ...(Array.isArray(after) ? after : [])];
  const result = {...before,...after};
  const [key,...rest] = segments;
  for (const child of key === '*' ? [...new Set([...Object.keys(before || {}),...Object.keys(after || {})])] : [key]) {
    result[child] = mergePath(before?.[child],after?.[child],rest);
  }
  return result;
}
export function mergeReportPages(before: any, after: any, paths: string[]): any {
  if (!before) return after;
  let result = {...before,...after};
  for (const pattern of paths) {
    const [key,...rest] = pattern.split('.');
    result[key] = mergePath(before?.[key],after?.[key],rest);
  }
  return result;
}
`);
write('service/report.interceptor.ts', `import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { EMPTY, Observable, expand, filter, map, reduce } from 'rxjs';
import { environment } from 'src/environments/environment';
import { REPORTS, mergeReportPages, nextReportPage } from './report-pages';
@Injectable()
export class ReportInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const base = environment.baseUrl.replace(/\\/+$/, '') + '/';
    const url = req.url.split('?')[0];
    const endpoint = url.startsWith(base) ? url.slice(base.length) : '';
    const config = REPORTS[endpoint];
    // Explicitly paginated consumers (including the dashboard) keep the API envelope.
    const explicit = req.params.has('page') || req.params.has('limit') || /[?&](page|limit)=/.test(req.url) || req.body?.page !== undefined || req.body?.limit !== undefined;
    if (!config || explicit || !['GET','POST'].includes(req.method)) return next.handle(req);
    const fetchPage = (page: number) => next.handle(req.clone({setParams:{page:String(page),limit:'100'}})).pipe(filter((event): event is HttpResponse<any> => event instanceof HttpResponse));
    const paths = endpoint === 'booking/consolidated-report-branch' ? [...config.paths,'deliverToPayDetails'] : config.paths;
    return fetchPage(1).pipe(expand(response => {
      const page = nextReportPage(response.body);
      if (page !== null && page <= response.body?.pagination?.page) throw new Error('Report pagination did not advance');
      return page === null ? EMPTY : fetchPage(page);
    }), reduce((previous: HttpResponse<any> | null, response: HttpResponse<any>) => response.clone({body: mergeReportPages(previous?.body,response.body,paths)}), null), map(response => {
      if (!response) throw new Error('Empty report response');
      return config.raw ? response.clone({body:response.body?.data || []}) : response;
    }));
  }
}
`);
const moduleFile = path.join(root,'app.module.ts');
let moduleText = fs.readFileSync(moduleFile,'utf8');
moduleText = "import { HTTP_INTERCEPTORS } from '@angular/common/http';\nimport { ReportInterceptor } from './service/report.interceptor';\n" + moduleText;
moduleText = moduleText.replace('providers: [MessageService]', 'providers: [MessageService, {provide: HTTP_INTERCEPTORS, useClass: ReportInterceptor, multi: true}]');
fs.writeFileSync(moduleFile,moduleText);
console.log(`Installed legacy report adapter for ${Object.keys(config).length} endpoints.`);
