import {Response} from "request";
import * as rp from "request-promise";
import * as Promise from "bluebird";

function request(baseUrl: string, method: string, endPoint: string, moreOptions = {}): rp.RequestPromise {
  const url = `${baseUrl}/api${endPoint}`;
  const headers = {};
  return rp({...moreOptions, method, url, headers, "resolveWithFullResponse": true});
}

function parseBody(res: Response): Response {
  if (typeof res.body === "string") {
    res.body = JSON.parse(res.body);
  }
  return res;
}

export default class ApiHttpClient {

  constructor(readonly baseUrl: string) {
  }

  get(endPoint: string, queryString: any = {}): Promise<Response> {
    return request(this.baseUrl, "GET", endPoint, {"qs": queryString}).then(parseBody);
  }

  post(endPoint: string, body: any = {}): Promise<Response> {
    return request(this.baseUrl, "POST", endPoint, {body, "json": true}).then(parseBody);
  }

  put(endPoint: string, body: any = {}): Promise<Response> {
    return request(this.baseUrl, "PUT", endPoint, {body, "json": true}).then(parseBody);
  }

  getRaw(endPoint: string, queryString: any = {}): rp.RequestPromise {
    return request(this.baseUrl, "GET", endPoint, {"qs": queryString, "encoding": null});
  }

}
